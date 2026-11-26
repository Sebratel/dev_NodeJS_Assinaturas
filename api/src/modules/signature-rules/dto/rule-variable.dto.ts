import { IsEnum, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { VariableSourceEnum } from '../types/variable-source.enum.js';

/** Uma variável do modelo e de onde a regra tira o valor. */
export class RuleVariableDTO {
  @IsString()
  @Matches(/^\w{1,60}$/, { message: 'key é o nome da variável do modelo (letras, números e _).' })
  key: string;

  @IsEnum(VariableSourceEnum)
  source: VariableSourceEnum;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  field?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  prefix?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  text?: string | null;
}
