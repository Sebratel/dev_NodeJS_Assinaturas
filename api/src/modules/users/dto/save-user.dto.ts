import { IsEmail, IsEnum, MaxLength } from 'class-validator';
import { UserRoleEnum } from '../types/user-role.enum.js';

const ROLE_MESSAGE = 'perfil inválido (use MASTER, EDITOR ou VIEWER).';

export class CreateUserDTO {
  @IsEmail({}, { message: 'e-mail inválido.' })
  @MaxLength(254)
  email: string;

  @IsEnum(UserRoleEnum, { message: ROLE_MESSAGE })
  role: UserRoleEnum;
}

export class UpdateUserDTO {
  @IsEnum(UserRoleEnum, { message: ROLE_MESSAGE })
  role: UserRoleEnum;
}
