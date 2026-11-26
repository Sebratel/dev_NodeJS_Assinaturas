import { HttpStatus, Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessException } from '../../common/exceptions/business.exception.js';
import { SignatureTemplatesService } from '../signature-templates/signature-templates.service.js';
import { TemplateRenderHelper } from '../signature-templates/template-render.helper.js';
import { DEFAULT_SIGNATURE_RULES } from './default-signature-rules.js';
import { CreateSignatureRuleDTO } from './dto/create-signature-rule.dto.js';
import { SignatureRuleEntity } from './entities/signature-rule.entity.js';
import { Phone0800ModeEnum } from './types/phone0800-mode.enum.js';
import { PhraseModeEnum } from './types/phrase-mode.enum.js';
import { VALUELESS_OPERATORS } from './types/rule-operator.enum.js';
import { SignatureRule } from './types/signature-rule.types.js';
import { VariableModeEnum } from './types/variable-mode.enum.js';

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
    return this.ruleRepository.find({ order: { priority: 'ASC', name: 'ASC' } });
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
    const definesSomething =
      [o.phone0800Mode, o.phone0800, o.contact, o.sectorLabel, o.phraseMode, o.templateId].some(
        (v) => v !== undefined && v !== null && v !== '',
      ) || Boolean(o.variables?.length);
    if (!definesSomething) problems.push({ field: 'outputs', message: 'a regra precisa definir pelo menos uma parte da assinatura.' });
    if (o.phone0800Mode === Phone0800ModeEnum.FIXED && !o.phone0800?.trim()) {
      problems.push({ field: 'outputs.phone0800', message: '0800 fixo precisa do número.' });
    }
    if (o.phraseMode === PhraseModeEnum.FIXED && !o.phraseText?.trim()) {
      problems.push({ field: 'outputs.phraseText', message: 'frase fixa precisa do texto.' });
    }
    const seen = new Set<string>();
    (o.variables ?? []).forEach((variable, i) => {
      const field = `outputs.variables[${i}]`;
      if (seen.has(variable.key)) problems.push({ field, message: `{{${variable.key}}} aparece duas vezes na mesma regra.` });
      seen.add(variable.key);
      if (variable.mode !== VariableModeEnum.TEXT) return;
      if (!variable.text?.trim()) problems.push({ field, message: `escreva o texto de {{${variable.key}}} ou escolha "Ocultar".` });
      else TemplateRenderHelper.validateText(variable.text).forEach((message) => problems.push({ field, message }));
    });
    if (problems.length) throw new BusinessException('SIGNATURE_RULE_INVALID', 'Regra inconsistente.', HttpStatus.BAD_REQUEST, problems);
  }

  /** Normaliza o que vem da tela: tira valores vazios e campos que a regra não define. */
  static clean(dto: CreateSignatureRuleDTO): Omit<SignatureRule, 'id'> {
    const blankToNull = <T>(v: T | null | undefined): T | null => (v === undefined || v === '' ? null : v);
    // Regra antiga (só o número, sem modo) vira FIXED.
    const phoneMode = dto.outputs.phone0800Mode ?? (dto.outputs.phone0800?.trim() ? Phone0800ModeEnum.FIXED : null);
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
      outputs: {
        phone0800Mode: phoneMode,
        phone0800: phoneMode === Phone0800ModeEnum.FIXED ? blankToNull(dto.outputs.phone0800?.trim()) : null,
        contact: blankToNull(dto.outputs.contact),
        sectorLabel: blankToNull(dto.outputs.sectorLabel),
        phraseMode: blankToNull(dto.outputs.phraseMode),
        phraseText: dto.outputs.phraseMode === PhraseModeEnum.FIXED ? blankToNull(dto.outputs.phraseText?.trim()) : null,
        templateId: blankToNull(dto.outputs.templateId),
        variables: dto.outputs.variables?.length
          ? dto.outputs.variables.map((v) => ({
              key: v.key,
              mode: v.mode,
              text: v.mode === VariableModeEnum.TEXT ? (v.text?.trim() ?? '') : null,
            }))
          : null,
      },
    };
  }
}
