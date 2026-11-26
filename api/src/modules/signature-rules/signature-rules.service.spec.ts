import { describe, expect, it } from 'vitest';
import { BusinessException } from '../../common/exceptions/business.exception.js';
import { CreateSignatureRuleDTO } from './dto/create-signature-rule.dto.js';
import { SignatureRulesService } from './signature-rules.service.js';
import { VariableSourceEnum } from './types/variable-source.enum.js';

const draft = (variables: CreateSignatureRuleDTO['outputs']['variables'], templateId?: string): CreateSignatureRuleDTO => ({
  name: ' B2B ',
  priority: 40,
  active: true,
  conditions: [],
  outputs: { templateId, variables },
});

const problemsOf = (dto: CreateSignatureRuleDTO): string[] => {
  try {
    SignatureRulesService.assertConsistent(dto);
    return [];
  } catch (error) {
    return (error as BusinessException).details.map((d) => d.message);
  }
};

describe('SignatureRulesService: variáveis do modelo na regra', () => {
  it('regra com campo, texto e vazio é válida; o que não é da fonte escolhida é descartado', () => {
    const dto = draft([
      { key: 'cargo', source: VariableSourceEnum.EMPTY, field: 'cargo', text: 'sobra' },
      { key: 'TESTE', source: VariableSourceEnum.FIELD, field: 'empresa', prefix: '  Empresa:  ', text: 'sobra' },
      { key: 'nome', source: VariableSourceEnum.FIELD, field: 'nome', prefix: '   ' },
      {
        key: 'contato',
        source: VariableSourceEnum.TEXT,
        field: 'ramal',
        prefix: ' Tel. ',
        suffix: ' (comercial) ',
        text: '  Ramal {{ramal}}  ',
      },
    ]);
    expect(problemsOf(dto)).toEqual([]);
    expect(SignatureRulesService.clean(dto).outputs.variables).toEqual([
      { key: 'cargo', source: VariableSourceEnum.EMPTY, field: null, prefix: null, suffix: null, text: null },
      { key: 'TESTE', source: VariableSourceEnum.FIELD, field: 'empresa', prefix: 'Empresa:', suffix: null, text: null },
      { key: 'nome', source: VariableSourceEnum.FIELD, field: 'nome', prefix: null, suffix: null, text: null },
      { key: 'contato', source: VariableSourceEnum.TEXT, field: null, prefix: 'Tel.', suffix: '(comercial)', text: 'Ramal {{ramal}}' },
    ]);
    expect(SignatureRulesService.clean(draft([])).outputs.variables).toBeNull();
  });

  it('regra só com modelo é válida; sem modelo nem variável, não', () => {
    expect(problemsOf(draft([], '7d1b0f44-0e7f-4a49-9b8a-0b9b7f7f0a11'))).toEqual([]);
    expect(problemsOf(draft([]))).toEqual(['a regra precisa definir o modelo ou pelo menos uma variável.']);
  });

  it('recusa {{img}}, variável repetida, campo inexistente, texto vazio, bloco e campo desconhecido no texto', () => {
    const problems = problemsOf(
      draft([
        { key: 'img', source: VariableSourceEnum.EMPTY },
        { key: 'cargo', source: VariableSourceEnum.EMPTY },
        { key: 'cargo', source: VariableSourceEnum.FIELD, field: 'xpto' },
        { key: 'frase', source: VariableSourceEnum.TEXT, text: ' ' },
        { key: 'setor', source: VariableSourceEnum.TEXT, text: '{{#time}}x{{/time}} {{xpto}}' },
      ]),
    ).join(' | ');
    expect(problems).toContain('{{img}} é técnica');
    expect(problems).toContain('{{cargo}} aparece duas vezes');
    expect(problems).toContain('campo válido para {{cargo}}');
    expect(problems).toContain('escreva o texto de {{frase}}');
    expect(problems).toContain('Blocos');
    expect(problems).toContain('Campo desconhecido no texto: {{xpto}}');
  });
});
