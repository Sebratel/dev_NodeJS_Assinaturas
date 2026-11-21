export enum SignatureStatusEnum {
  /** Tudo preenchido: pode ir para o Gmail. */
  READY = 'READY',
  /** Falta dado (celular, ramal...) para alguma parte definida pelas regras. */
  PENDING = 'PENDING',
  /** Duas regras de mesma prioridade decidem diferente a mesma parte. */
  CONFLICT = 'CONFLICT',
  /** Nenhuma regra ativa casa com a pessoa. */
  NO_RULE = 'NO_RULE',
}
