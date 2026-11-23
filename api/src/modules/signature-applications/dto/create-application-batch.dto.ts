import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ApplicationFilterDTO } from './application-filter.dto.js';

/** Quem recebe: uma lista de ids OU um filtro (todos que casam com ele). */
export class CreateApplicationBatchDTO {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(2000)
  @IsString({ each: true })
  collaboratorIds?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => ApplicationFilterDTO)
  filter?: ApplicationFilterDTO;

  /** Grava também as pendentes (saem sem a parte que falta, ex.: sem celular). */
  @IsBoolean()
  includePending: boolean;
}
