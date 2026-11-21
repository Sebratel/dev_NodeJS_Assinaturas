import { RuleField } from '../../directory/types/collaborator.js';
import { ContactTypeEnum } from './contact-type.enum.js';
import { PhraseModeEnum } from './phrase-mode.enum.js';
import { RuleOperatorEnum } from './rule-operator.enum.js';
import { SectorLabelEnum } from './sector-label.enum.js';

/** Condição: o campo do colaborador comparado com a lista (dentro da lista é "OU"). */
export interface RuleCondition {
  field: RuleField;
  operator: RuleOperatorEnum;
  values: string[];
}

/** O que a regra define. Campo ausente/nulo = a regra não mexe nessa parte da assinatura. */
export interface RuleOutputs {
  phone0800?: string | null;
  contact?: ContactTypeEnum | null;
  sectorLabel?: SectorLabelEnum | null;
  phraseMode?: PhraseModeEnum | null;
  phraseText?: string | null;
}

/** Regra como o motor enxerga (todas as condições precisam casar: "E"). */
export interface SignatureRule {
  id: string;
  name: string;
  description: string;
  priority: number;
  active: boolean;
  conditions: RuleCondition[];
  outputs: RuleOutputs;
}
