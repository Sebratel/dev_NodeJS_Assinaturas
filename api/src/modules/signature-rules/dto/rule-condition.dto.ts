import { ArrayMaxSize, IsArray, IsEnum, IsIn, IsString, MaxLength } from 'class-validator';
import { RULE_FIELDS, RuleField } from '../../directory/types/collaborator.js';
import { RuleOperatorEnum } from '../types/rule-operator.enum.js';

export class RuleConditionDTO {
  @IsIn(RULE_FIELDS as unknown as string[], { message: `field deve ser um de: ${RULE_FIELDS.join(', ')}.` })
  field: RuleField;

  @IsEnum(RuleOperatorEnum, { message: 'operator inválido.' })
  operator: RuleOperatorEnum;

  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  values: string[];
}
