/** O que aparece antes do cargo: a área ("Técnica"), o time ("Suporte Técnico") ou nada (só o cargo). */
export enum SectorLabelEnum {
  AREA = 'AREA',
  TEAM = 'TEAM',
  /** Nada antes do cargo: {{setor}} fica vazio e o modelo esconde o separador (seção {{#setor}}…{{/setor}}). */
  NONE = 'NONE',
}
