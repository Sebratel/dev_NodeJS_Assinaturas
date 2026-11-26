import { describe, expect, it } from 'vitest';
import { BusinessException } from '../../common/exceptions/business.exception.js';
import { CreateSignatureRuleDTO } from './dto/create-signature-rule.dto.js';
import { SignatureRulesService } from './signature-rules.service.js';
import { VariableModeEnum } from './types/variable-mode.enum.js';

const draft = (variables: CreateSignatureRuleDTO['outputs']['variables']): CreateSignatureRuleDTO => ({
  name: ' B2B ',
  priority: 40,
  active: true,
  conditions: [],
  outputs: { variables },
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
  it('regra que só esconde ou troca variável é válida e fica normalizada', () => {
    const dto = draft([
      { key: 'cargo', mode: VariableModeEnum.HIDE, text: 'ignorado' },
      { key: 'setor', mode: VariableModeEnum.TEXT, text: '  {{empresa}}  ' },
    ]);
    expect(problemsOf(dto)).toEqual([]);
    expect(SignatureRulesService.clean(dto).outputs.variables).toEqual([
      { key: 'cargo', mode: VariableModeEnum.HIDE, text: null },
      { key: 'setor', mode: VariableModeEnum.TEXT, text: '{{empresa}}' },
    ]);
    expect(SignatureRulesService.clean(draft([])).outputs.variables).toBeNull();
  });

  it('recusa regra vazia, variável repetida, texto vazio, bloco e variável desconhecida no texto', () => {
    expect(problemsOf(draft([]))).toEqual(['a regra precisa definir pelo menos uma parte da assinatura.']);
    const problems = problemsOf(
      draft([
        { key: 'cargo', mode: VariableModeEnum.HIDE },
        { key: 'cargo', mode: VariableModeEnum.TEXT, text: ' ' },
        { key: 'frase', mode: VariableModeEnum.TEXT, text: '{{#time}}x{{/time}} {{xpto}}' },
      ]),
    );
    expect(problems[0]).toContain('duas vezes');
    expect(problems[1]).toContain('Ocultar');
    expect(problems.slice(2).join(' ')).toContain('Blocos');
    expect(problems.slice(2).join(' ')).toContain('{{xpto}}');
  });
});
