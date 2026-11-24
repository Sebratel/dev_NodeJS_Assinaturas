import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Put, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiResponseHelper } from '../../common/helpers/api-response.helper.js';
import { CurrentUser, RequireRole } from '../auth/auth.decorators.js';
import type { AuthUser } from '../auth/auth.service.js';
import { CreateUserDTO, UpdateUserDTO } from './dto/save-user.dto.js';
import { UserRoleEnum } from './types/user-role.enum.js';
import { UsersService } from './users.service.js';

/** Tela Usuários: quem entra e com que perfil. Só MASTER. */
@RequireRole(UserRoleEnum.MASTER)
@Controller('v1/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll() {
    return ApiResponseHelper.ok(await this.usersService.findAll());
  }

  @Post()
  async create(@Body() dto: CreateUserDTO, @CurrentUser() actor: AuthUser, @Res({ passthrough: true }) response: Response) {
    const user = await this.usersService.create(dto, actor);
    response.status(201).location(`/api/v1/users/${user.id}`);
    return ApiResponseHelper.ok(user);
  }

  @Put(':id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDTO, @CurrentUser() actor: AuthUser) {
    return ApiResponseHelper.ok(await this.usersService.updateRole(id, dto, actor));
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthUser): Promise<void> {
    await this.usersService.remove(id, actor);
  }
}
