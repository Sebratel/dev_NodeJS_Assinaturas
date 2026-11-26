import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { CreateSignatureRuleDTO } from '../../signature-rules/dto/create-signature-rule.dto.js';

/** Rascunho de regra para simular antes de salvar. Com id, substitui a regra existente na simulação. */
export class SimulateSignatureRuleDTO extends CreateSignatureRuleDTO {
  @IsOptional()
  @IsUUID('all')
  id?: string;

  /** Pessoa da prévia da assinatura. Sem ela (ou se não existir), vale a primeira que a regra pega. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  previewCollaboratorId?: string;
}
