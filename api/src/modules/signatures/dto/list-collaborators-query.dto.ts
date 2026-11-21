import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { CollaboratorLevelEnum } from '../../directory/types/collaborator-level.enum.js';
import { SignatureStatusEnum } from '../types/signature-status.enum.js';

export class ListCollaboratorsQueryDTO {
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

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;
}
