export enum RuleOperatorEnum {
  IN = 'IN',
  NOT_IN = 'NOT_IN',
  CONTAINS = 'CONTAINS',
  IS_EMPTY = 'IS_EMPTY',
  IS_NOT_EMPTY = 'IS_NOT_EMPTY',
}

/** Operadores que não usam a lista de valores. */
export const VALUELESS_OPERATORS: RuleOperatorEnum[] = [RuleOperatorEnum.IS_EMPTY, RuleOperatorEnum.IS_NOT_EMPTY];
