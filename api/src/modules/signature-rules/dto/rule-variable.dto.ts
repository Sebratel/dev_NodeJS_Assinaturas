import { IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { OVERRIDABLE_VARIABLE_KEYS } from '../../signature-templates/template-render.helper.js';
import { VariableModeEnum } from '../types/variable-mode.enum.js';

/** Variável do modelo que a regra esconde (HIDE) ou troca por texto (TEXT). */
export class RuleVariableDTO {
  @IsIn(OVERRIDABLE_VARIABLE_KEYS, { message: 'key precisa ser uma variável do modelo que a regra pode mudar.' })
  key: string;

  @IsEnum(VariableModeEnum)
  mode: VariableModeEnum;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  text?: string | null;
}
