import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { CollaboratorLevelEnum } from '../../directory/types/collaborator-level.enum.js';
import { SignatureStatusEnum } from '../../signatures/types/signature-status.enum.js';

/** Mesmos filtros da lista de colaboradores ("selecionar todos do filtro"). */
export class ApplicationFilterDTO {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  search?: string;

  @IsOptional()
  @IsString()
  area?: string;

  @IsOptional()
  @IsString()
  team?: string;

  @IsOptional()
  @IsEnum(CollaboratorLevelEnum)
  level?: CollaboratorLevelEnum;

  @IsOptional()
  @IsEnum(SignatureStatusEnum)
  status?: SignatureStatusEnum;
}
