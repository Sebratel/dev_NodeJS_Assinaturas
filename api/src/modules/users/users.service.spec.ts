import { HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import type { Repository } from 'typeorm';
import { beforeEach, describe, expect, it } from 'vitest';
import { BusinessException } from '../../common/exceptions/business.exception.js';
import { assertRole } from '../auth/auth.decorators.js';
import type { AuthUser } from '../auth/auth.service.js';
import type { UserEntity } from './entities/user.entity.js';
import { UserRoleEnum } from './types/user-role.enum.js';
import { UsersService } from './users.service.js';

/** Tabela users em memória, com exclusão lógica como o TypeORM faz (removido some das consultas comuns). */
function fakeRepository() {
  const rows: UserEntity[] = [];
  const alive = () => rows.filter((row) => !row.deletedAt);
  const repository = {
    rows,
    findOneBy: async (where: Partial<UserEntity>) =>
      alive().find((row) => Object.entries(where).every(([k, v]) => row[k as keyof UserEntity] === v)) ?? null,
    findOne: async ({ where, withDeleted }: { where: Partial<UserEntity>; withDeleted?: boolean }) =>
      (withDeleted ? rows : alive()).find((row) => Object.entries(where).every(([k, v]) => row[k as keyof UserEntity] === v)) ?? null,
    find: async () => [...alive()].sort((a, b) => a.email.localeCompare(b.email)),
    create: (data: Partial<UserEntity>) => ({ ...data }) as UserEntity,
    save: async (entity: UserEntity) => {
      if (!entity.id) {
        Object.assign(entity, { id: randomUUID(), createdAt: new Date(), updatedAt: new Date(), deletedAt: null, lastLoginAt: null });
        rows.push(entity);
      }
      return entity;
    },
    update: async (where: Partial<UserEntity>, patch: Partial<UserEntity>) => {
      for (const row of alive()) if (Object.entries(where).every(([k, v]) => row[k as keyof UserEntity] === v)) Object.assign(row, patch);
    },
    softDelete: async ({ id }: { id: string }) => {
      const row = rows.find((r) => r.id === id);
      if (row) row.deletedAt = new Date();
    },
    restore: async ({ id }: { id: string }) => {
      const row = rows.find((r) => r.id === id);
      if (row) row.deletedAt = null;
    },
  };
  return repository;
}

const MASTER: AuthUser = { email: 'misael.cruz@sebratel.com.br', name: 'Misael', role: UserRoleEnum.MASTER };

async function failure(promise: Promise<unknown>): Promise<{ status: number; code: string }> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof BusinessException) return { status: error.getStatus(), code: error.code };
    throw error;
  }
  throw new Error('deveria ter falhado');
}

describe('UsersService', () => {
  let repository: ReturnType<typeof fakeRepository>;
  let service: UsersService;

  beforeEach(() => {
    repository = fakeRepository();
    const config = new ConfigService({
      AUTH_ENABLED: 'true',
      FIREBASE_PROJECT_ID: 'sistema-gestor-assinatur-9be62',
      AUTH_ADMIN_EMAILS: 'misael.cruz@sebratel.com.br',
    });
    service = new UsersService(repository as unknown as Repository<UserEntity>, config);
  });

  it('inclui em minúsculas e o perfil passa a valer no login', async () => {
    await service.create({ email: 'Nova.Pessoa@sebratel.com.br', role: UserRoleEnum.EDITOR }, MASTER);
    expect(await service.findRole('nova.pessoa@sebratel.com.br')).toBe(UserRoleEnum.EDITOR);
    expect(repository.rows[0]).toMatchObject({ email: 'nova.pessoa@sebratel.com.br', createdBy: MASTER.email });
  });

  it('toda conta do domínio é Visualizador sem cadastro; fora do domínio, nenhum perfil', async () => {
    expect(await service.findRole('Qualquer.Pessoa@sebratel.com.br')).toBe(UserRoleEnum.VIEWER);
    expect(await service.findRole('pessoa@gmail.com')).toBeNull();
    expect(await service.findRole('pessoa@sebratel.com.br.evil.com')).toBeNull();
  });

  it('recusa e-mail de fora do domínio, incluir como Visualizador, master da stack e e-mail repetido', async () => {
    expect(await failure(service.create({ email: 'alguem@gmail.com', role: UserRoleEnum.EDITOR }, MASTER))).toEqual({
      status: HttpStatus.BAD_REQUEST,
      code: 'USER_INVALID',
    });
    expect(await failure(service.create({ email: 'leitor@sebratel.com.br', role: UserRoleEnum.VIEWER }, MASTER))).toEqual({
      status: HttpStatus.BAD_REQUEST,
      code: 'USER_INVALID',
    });
    expect(await failure(service.create({ email: MASTER.email, role: UserRoleEnum.EDITOR }, MASTER))).toEqual({
      status: HttpStatus.CONFLICT,
      code: 'USER_ALREADY_EXISTS',
    });
    await service.create({ email: 'editora@sebratel.com.br', role: UserRoleEnum.EDITOR }, MASTER);
    expect(await failure(service.create({ email: 'editora@sebratel.com.br', role: UserRoleEnum.MASTER }, MASTER))).toMatchObject({
      code: 'USER_ALREADY_EXISTS',
    });
  });

  it('remover é lógico: volta a Visualizador, e incluir de novo reaproveita a linha com o perfil novo', async () => {
    const user = await service.create({ email: 'editora@sebratel.com.br', role: UserRoleEnum.EDITOR }, MASTER);
    await service.remove(user.id!, MASTER);
    expect(await service.findRole('editora@sebratel.com.br')).toBe(UserRoleEnum.VIEWER);
    expect(repository.rows).toHaveLength(1);

    const again = await service.create({ email: 'editora@sebratel.com.br', role: UserRoleEnum.MASTER }, MASTER);
    expect(again.id).toBe(user.id);
    expect(await service.findRole('editora@sebratel.com.br')).toBe(UserRoleEnum.MASTER);
    expect(repository.rows).toHaveLength(1);
  });

  it('ninguém muda o próprio perfil nem se remove', async () => {
    const other = await service.create({ email: 'outro.master@sebratel.com.br', role: UserRoleEnum.MASTER }, MASTER);
    const self: AuthUser = { email: 'outro.master@sebratel.com.br', name: 'Outro', role: UserRoleEnum.MASTER };
    expect(await failure(service.updateRole(other.id!, { role: UserRoleEnum.VIEWER }, self))).toMatchObject({ code: 'USER_SELF_CHANGE' });
    expect(await failure(service.remove(other.id!, self))).toMatchObject({ code: 'USER_SELF_CHANGE' });
    // Outro master pode.
    await expect(service.updateRole(other.id!, { role: UserRoleEnum.VIEWER }, MASTER)).resolves.toMatchObject({
      role: UserRoleEnum.VIEWER,
    });
  });

  it('lista os masters da stack primeiro, fixos e sem id', async () => {
    await service.create({ email: 'editora@sebratel.com.br', role: UserRoleEnum.EDITOR }, MASTER);
    const list = await service.findAll();
    expect(list.map(({ email, role, fixed, id }) => ({ email, role, fixed, hasId: id !== null }))).toEqual([
      { email: MASTER.email, role: UserRoleEnum.MASTER, fixed: true, hasId: false },
      { email: 'editora@sebratel.com.br', role: UserRoleEnum.EDITOR, fixed: false, hasId: true },
    ]);
  });
});

describe('assertRole (perfil mínimo da rota)', () => {
  const as = (role: UserRoleEnum): AuthUser => ({ email: 'x@sebratel.com.br', name: 'X', role });

  it('perfil maior ou igual passa', () => {
    expect(() => assertRole(as(UserRoleEnum.MASTER), UserRoleEnum.EDITOR)).not.toThrow();
    expect(() => assertRole(as(UserRoleEnum.EDITOR), UserRoleEnum.EDITOR)).not.toThrow();
    expect(() => assertRole(as(UserRoleEnum.VIEWER), UserRoleEnum.VIEWER)).not.toThrow();
  });

  it('perfil menor recebe 403 ROLE_FORBIDDEN (não o AUTH_FORBIDDEN de "sem acesso")', () => {
    for (const [role, required] of [
      [UserRoleEnum.VIEWER, UserRoleEnum.EDITOR],
      [UserRoleEnum.EDITOR, UserRoleEnum.MASTER],
    ] as const) {
      try {
        assertRole(as(role), required);
        throw new Error('deveria ter recusado');
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException);
        expect((error as BusinessException).code).toBe('ROLE_FORBIDDEN');
        expect((error as BusinessException).getStatus()).toBe(HttpStatus.FORBIDDEN);
      }
    }
  });
});
