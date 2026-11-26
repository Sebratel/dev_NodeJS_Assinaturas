import { HttpStatus, Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessException } from '../../common/exceptions/business.exception.js';
import { SignatureTemplatesService } from '../signature-templates/signature-templates.service.js';
import { SignatureFieldsHelper } from '../signature-templates/signature-fields.js';
import { IMAGE_VARIABLE } from '../signature-templates/template-render.helper.js';
import { DEFAULT_SIGNATURE_RULES } from './default-signature-rules.js';
import { CreateSignatureRuleDTO } from './dto/create-signature-rule.dto.js';
import { SignatureRuleEntity } from './entities/signature-rule.entity.js';
import { VALUELESS_OPERATORS } from './types/rule-operator.enum.js';
import { SignatureRule } from './types/signature-rule.types.js';
import { VariableSourceEnum } from './types/variable-source.enum.js';

@Injectable()
export class SignatureRulesService implements OnModuleInit {
  constructor(
    @InjectRepository(SignatureRuleEntity) private readonly ruleRepository: Repository<SignatureRuleEntity>,
    private readonly signatureTemplatesService: SignatureTemplatesService,
  ) {}

  /** Semeia as regras iniciais só se a tabela nunca teve nada (inclusive excluídas). */
  async onModuleInit(): Promise<void> {
    const total = await this.ruleRepository.count({ withDeleted: true });
    if (total === 0) await this.ruleRepository.save(DEFAULT_SIGNATURE_RULES.map((rule) => this.ruleRepository.create(rule)));
  }

  findAll(): Promise<SignatureRuleEntity[]> {
    // Prioridade maior primeiro: é a que vence (o motor ordena por conta própria).
    return this.ruleRepository.find({ order: { priority: 'DESC', name: 'ASC' } });
  }

  async findOne(id: string): Promise<SignatureRuleEntity> {
    const rule = await this.ruleRepository.findOneBy({ id });
    if (!rule) throw new BusinessException('SIGNATURE_RULE_NOT_FOUND', 'Regra não encontrada.', HttpStatus.NOT_FOUND);
    return rule;
  }

  async create(dto: CreateSignatureRuleDTO): Promise<SignatureRuleEntity> {
    SignatureRulesService.assertConsistent(dto);
    await this.assertTemplateExists(dto.outputs.templateId);
    return this.ruleRepository.save(this.ruleRepository.create(SignatureRulesService.clean(dto)));
  }

  async update(id: string, dto: CreateSignatureRuleDTO): Promise<SignatureRuleEntity> {
    const rule = await this.findOne(id);
    SignatureRulesService.assertConsistent(dto);
    await this.assertTemplateExists(dto.outputs.templateId);
    return this.ruleRepository.save(Object.assign(rule, SignatureRulesService.clean(dto)));
  }

  private async assertTemplateExists(templateId: string | null | undefined): Promise<void> {
    if (templateId) await this.signatureTemplatesService.findOne(templateId);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.ruleRepository.softDelete({ id });
  }

  /** Regras de negócio que o formato sozinho não pega. Também usada pela simulação. */
  static assertConsistent(dto: CreateSignatureRuleDTO): void {
    const problems: Array<{ field?: string; message: string }> = [];
    dto.conditions.forEach((condition, i) => {
      if (!VALUELESS_OPERATORS.includes(condition.operator) && !condition.values.some((v) => v.trim())) {
        problems.push({ field: `conditions[${i}].values`, message: 'informe pelo menos um valor.' });
      }
    });
    const o = dto.outputs;
    if (!o.templateId && !o.variables?.length) {
      problems.push({ field: 'outputs', message: 'a regra precisa definir o modelo ou pelo menos uma variável.' });
    }
    const seen = new Set<string>();
    (o.variables ?? []).forEach((variable, i) => {
      const field = `outputs.variables[${i}]`;
      const name = `{{${variable.key}}}`;
      if (variable.key === IMAGE_VARIABLE)
        problems.push({ field, message: `${name} é técnica (endereço das imagens) e não sai por regra.` });
      if (seen.has(variable.key)) problems.push({ field, message: `${name} aparece duas vezes na mesma regra.` });
      seen.add(variable.key);
      if (variable.source === VariableSourceEnum.FIELD && !SignatureFieldsHelper.isField(variable.field ?? '')) {
        problems.push({ field, message: `escolha um campo válido para ${name}.` });
      }
      if (variable.source === VariableSourceEnum.TEXT) {
        if (!variable.text?.trim()) problems.push({ field, message: `escreva o texto de ${name} ou escolha "Vazio".` });
        else SignatureFieldsHelper.validateText(variable.text).forEach((message) => problems.push({ field, message }));
      }
    });
    if (problems.length) throw new BusinessException('SIGNATURE_RULE_INVALID', 'Regra inconsistente.', HttpStatus.BAD_REQUEST, problems);
  }

  /** Normaliza o que vem da tela: só o que a regra define, sem sobra de campo/texto de outra fonte. */
  static clean(dto: CreateSignatureRuleDTO): Omit<SignatureRule, 'id'> {
    const variables = (dto.outputs.variables ?? []).map((v) => {
      const hasValue = v.source === VariableSourceEnum.FIELD || v.source === VariableSourceEnum.TEXT;
      return {
        key: v.key,
        source: v.source,
        field: v.source === VariableSourceEnum.FIELD ? (v.field ?? null) : null,
        prefix: hasValue ? v.prefix?.trim() || null : null,
        suffix: hasValue ? v.suffix?.trim() || null : null,
        text: v.source === VariableSourceEnum.TEXT ? (v.text?.trim() ?? '') : null,
      };
    });
    return {
      name: dto.name.trim(),
      description: dto.description?.trim() ?? '',
      priority: dto.priority,
      active: dto.active,
      conditions: dto.conditions.map((c) => ({
        field: c.field,
        operator: c.operator,
        values: VALUELESS_OPERATORS.includes(c.operator) ? [] : c.values.map((v) => v.trim()).filter(Boolean),
      })),
      outputs: { templateId: dto.outputs.templateId || null, variables: variables.length ? variables : null },
    };
  }
}
