import { IsOptional, IsUUID } from 'class-validator';
import { CreateSignatureRuleDTO } from '../../signature-rules/dto/create-signature-rule.dto.js';

/** Rascunho de regra para simular antes de salvar. Com id, substitui a regra existente na simulação. */
export class SimulateSignatureRuleDTO extends CreateSignatureRuleDTO {
  @IsOptional()
  @IsUUID('all')
  id?: string;
}
