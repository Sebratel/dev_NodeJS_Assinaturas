import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { RuleConditionDTO } from '../../signature-rules/dto/rule-condition.dto.js';

export class SavePhraseProfileDTO {
  /** Só na simulação: com id, substitui o perfil existente. */
  @IsOptional()
  @IsUUID('all')
  id?: string;

  @IsString()
  @IsNotEmpty({ message: 'name é obrigatório.' })
  @MaxLength(80)
  name: string;

  @IsInt()
  @Min(0)
  @Max(1000)
  priority: number;

  @IsBoolean()
  active: boolean;

  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => RuleConditionDTO)
  conditions: RuleConditionDTO[];

  @IsString()
  @IsNotEmpty({ message: 'phrase é obrigatória.' })
  @MaxLength(140, { message: 'A frase pode ter até 140 caracteres.' })
  phrase: string;
}
