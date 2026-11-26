/** De onde a regra tira o valor de uma variável do modelo. */
export enum VariableSourceEnum {
  /** Um campo do AD ou do sistema (Cargo, Celular corporativo, Frase…). */
  FIELD = 'FIELD',
  /** Texto fixo da regra; pode citar campos: "Ramal {{ramal}}". */
  TEXT = 'TEXT',
  /** Em branco: some também o bloco {{#variavel}}…{{/variavel}} do modelo. */
  EMPTY = 'EMPTY',
}
