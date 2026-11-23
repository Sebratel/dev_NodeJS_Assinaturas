export enum ApplicationStatusEnum {
  /** Gravada no Gmail. */
  APPLIED = 'APPLIED',
  /** Já estava igual: nada foi gravado. */
  UNCHANGED = 'UNCHANGED',
  /** Não gravada de propósito (pendente, fora da lista de teste, passa do limite…). */
  SKIPPED = 'SKIPPED',
  /** O Google recusou ou deu erro. */
  FAILED = 'FAILED',
  /** Assinatura anterior devolvida ao Gmail. */
  RESTORED = 'RESTORED',
}
