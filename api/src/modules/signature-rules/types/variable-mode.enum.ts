/** O que a regra faz com uma variável do modelo. */
export enum VariableModeEnum {
  /** Deixa vazia: some o texto e os blocos {{#variavel}}…{{/variavel}} do modelo. */
  HIDE = 'HIDE',
  /** Troca pelo texto da regra, que pode usar outras variáveis ({{time}}, {{empresa}}…). */
  TEXT = 'TEXT',
}
