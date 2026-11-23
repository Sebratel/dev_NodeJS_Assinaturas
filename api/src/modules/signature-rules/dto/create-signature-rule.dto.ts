import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { RuleConditionDTO } from './rule-condition.dto.js';
import { RuleOutputsDTO } from './rule-outputs.dto.js';

export class CreateSignatureRuleDTO {
  @IsString()
  @IsNotEmpty({ message: 'name é obrigatório.' })
  @MaxLength(80)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @IsInt()
  @Min(0)
  @Max(1000)
  priority: number;

  @IsBoolean()
  active: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RuleConditionDTO)
  conditions: RuleConditionDTO[];

  @IsObject()
  @ValidateNested()
  @Type(() => RuleOutputsDTO)
  outputs: RuleOutputsDTO;
}
