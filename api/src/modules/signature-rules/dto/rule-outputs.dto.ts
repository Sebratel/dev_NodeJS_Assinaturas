import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsOptional, IsUUID, ValidateNested } from 'class-validator';
import { RuleVariableDTO } from './rule-variable.dto.js';

export class RuleOutputsDTO {
  @IsOptional()
  @IsUUID('all')
  templateId?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(60)
  @ValidateNested({ each: true })
  @Type(() => RuleVariableDTO)
  variables?: RuleVariableDTO[] | null;
}
