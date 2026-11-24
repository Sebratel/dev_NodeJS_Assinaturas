import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessException } from '../../common/exceptions/business.exception.js';
import { readAuthSettings } from '../auth/auth-settings.js';
import type { AuthUser } from '../auth/auth.service.js';
import { CreateUserDTO, UpdateUserDTO } from './dto/save-user.dto.js';
import { UserEntity } from './entities/user.entity.js';
import { UserRoleEnum } from './types/user-role.enum.js';

/** O driver devolve Date (MariaDB) ou texto (sql.js, local). */
const toIso = (value: Date | string | null | undefined): string | null => (value ? new Date(value).toISOString() : null);

/** Linha da tela Usuários. `fixed` = master do AUTH_ADMIN_EMAILS (stack): não se edita nem se remove pela tela. */
export interface UserView {
  id: string | null;
  email: string;
  name: string | null;
  role: UserRoleEnum;
  fixed: boolean;
  lastLoginAt: string | null;
  createdBy: string | null;
  createdAt: string | null;
}

/**
 * Quem entra e com que perfil. Os e-mails do AUTH_ADMIN_EMAILS são MASTER fixos: garantem que sempre existe
 * alguém capaz de gerenciar o acesso, mesmo com a tabela vazia ou alterada por engano.
 */
@Injectable()
export class UsersService {
  private readonly fixedMasters: ReadonlySet<string>;
  private readonly allowedDomain: string;

  constructor(
    @InjectRepository(UserEntity) private readonly userRepository: Repository<UserEntity>,
    configService: ConfigService,
  ) {
    const settings = readAuthSettings(configService);
    this.fixedMasters = settings.adminEmails;
    this.allowedDomain = settings.allowedDomain;
  }

  /** Perfil de quem fez login; null = sem acesso. */
  async findRole(email: string): Promise<UserRoleEnum | null> {
    const normalized = email.trim().toLowerCase();
    if (this.fixedMasters.has(normalized)) return UserRoleEnum.MASTER;
    const user = await this.userRepository.findOneBy({ email: normalized });
    return user?.role ?? null;
  }

  /** Último acesso e nome da conta Google, para a tela. Master fixo sem linha: nada a registrar. */
  async touchLogin(email: string, name: string): Promise<void> {
    await this.userRepository.update({ email: email.trim().toLowerCase() }, { lastLoginAt: new Date(), name: name.slice(0, 120) });
  }

  async findAll(): Promise<UserView[]> {
    const users = await this.userRepository.find({ order: { email: 'ASC' } });
    const fixed: UserView[] = [...this.fixedMasters].sort().map((email) => {
      const row = users.find((user) => user.email === email);
      return {
        id: null,
        email,
        name: row?.name ?? null,
        role: UserRoleEnum.MASTER,
        fixed: true,
        lastLoginAt: toIso(row?.lastLoginAt),
        createdBy: null,
        createdAt: null,
      };
    });
    return [...fixed, ...users.filter((user) => !this.fixedMasters.has(user.email)).map((user) => UsersService.toView(user))];
  }

  async create(dto: CreateUserDTO, actor: AuthUser): Promise<UserView> {
    const email = dto.email.trim().toLowerCase();
    if (!email.endsWith(`@${this.allowedDomain}`)) {
      throw new BusinessException('USER_INVALID', `Use um e-mail @${this.allowedDomain}.`, HttpStatus.BAD_REQUEST, [
        { field: 'email', message: `o e-mail precisa ser @${this.allowedDomain}.` },
      ]);
    }
    if (this.fixedMasters.has(email)) {
      throw new BusinessException('USER_ALREADY_EXISTS', 'Este e-mail já é master pela stack (AUTH_ADMIN_EMAILS).', HttpStatus.CONFLICT);
    }
    const existing = await this.userRepository.findOne({ where: { email }, withDeleted: true });
    if (existing && !existing.deletedAt) {
      throw new BusinessException('USER_ALREADY_EXISTS', 'Este e-mail já tem acesso. Troque o perfil na lista.', HttpStatus.CONFLICT);
    }
    if (existing) {
      // Removido antes: volta com o perfil novo (o e-mail é único, então a linha antiga é reaproveitada).
      await this.userRepository.restore({ id: existing.id });
      return UsersService.toView(
        await this.userRepository.save(Object.assign(existing, { deletedAt: null, role: dto.role, updatedBy: actor.email })),
      );
    }
    const user = this.userRepository.create({ email, role: dto.role, name: null, createdBy: actor.email, updatedBy: null });
    return UsersService.toView(await this.userRepository.save(user));
  }

  async updateRole(id: string, dto: UpdateUserDTO, actor: AuthUser): Promise<UserView> {
    const user = await this.findEditable(id, actor);
    return UsersService.toView(await this.userRepository.save(Object.assign(user, { role: dto.role, updatedBy: actor.email })));
  }

  /** Exclusão lógica: a pessoa perde o acesso no próximo pedido; a linha fica para auditoria. */
  async remove(id: string, actor: AuthUser): Promise<void> {
    const user = await this.findEditable(id, actor);
    await this.userRepository.update({ id: user.id }, { updatedBy: actor.email });
    await this.userRepository.softDelete({ id: user.id });
  }

  /**
   * Ninguém muda o próprio perfil nem se remove. Isso também impede que o sistema fique sem master:
   * para rebaixar um master, quem pede tem de ser outro master, que continua master.
   */
  private async findEditable(id: string, actor: AuthUser): Promise<UserEntity> {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) throw new BusinessException('USER_NOT_FOUND', 'Usuário não encontrado.', HttpStatus.NOT_FOUND);
    if (this.fixedMasters.has(user.email)) {
      throw new BusinessException('USER_FIXED', 'Master pela stack (AUTH_ADMIN_EMAILS): mude no Portainer.', HttpStatus.BAD_REQUEST);
    }
    if (user.email === actor.email.toLowerCase()) {
      throw new BusinessException('USER_SELF_CHANGE', 'Você não pode mudar o próprio perfil nem se remover.', HttpStatus.BAD_REQUEST);
    }
    return user;
  }

  private static toView(user: UserEntity): UserView {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      fixed: false,
      lastLoginAt: toIso(user.lastLoginAt),
      createdBy: user.createdBy,
      createdAt: toIso(user.createdAt),
    };
  }
}
