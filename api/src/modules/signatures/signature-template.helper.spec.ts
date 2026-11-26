import { describe, expect, it } from 'vitest';
import { ContactTypeEnum } from '../signature-rules/types/contact-type.enum.js';
import { VariableModeEnum } from '../signature-rules/types/variable-mode.enum.js';
import { SignatureTemplateHelper } from './signature-template.helper.js';
import { SignatureContent } from './types/signature-evaluation.types.js';

const content = (overrides: SignatureContent['overrides'] = {}): SignatureContent => ({
  name: 'Fulano',
  email: 'fulano@sebratel.com.br',
  sectorText: 'Comercial B2B',
  area: 'Comercial',
  team: 'Comercial B2B',
  title: 'Executivo de Contas',
  contactType: ContactTypeEnum.CORPORATE_MOBILE,
  contactText: '(51) 98888-7777',
  phrase: 'Conectando empresas.',
  phone0800: '0800 365 8000',
  company: 'Sebratel Empresas',
  department: '',
  segment: '',
  state: 'RS',
  office: '',
  overrides,
});

describe('SignatureTemplateHelper: variáveis trocadas por regra', () => {
  it('Ocultar deixa vazio e some o bloco; Texto usa os valores de antes da troca', () => {
    const tpl = '{{#cargo}}[{{cargo}}]{{/cargo}}|{{setor}}|{{frase}}';
    expect(SignatureTemplateHelper.render(content(), 'https://x', tpl)).toBe('[Executivo de Contas]|Comercial B2B|Conectando empresas.');
    const changed = content({
      cargo: { mode: VariableModeEnum.HIDE, text: null },
      setor: { mode: VariableModeEnum.TEXT, text: '{{empresa}} · {{cargo}}' },
    });
    expect(SignatureTemplateHelper.render(changed, 'https://x', tpl)).toBe('|Sebratel Empresas · Executivo de Contas|Conectando empresas.');
  });

  it('texto da regra é escapado no HTML; img e variável desconhecida não são trocadas', () => {
    const vars = SignatureTemplateHelper.toVariables(
      content({
        frase: { mode: VariableModeEnum.TEXT, text: '<b>Oi</b> {{segmento}}' },
        img: { mode: VariableModeEnum.HIDE, text: null },
        xpto: { mode: VariableModeEnum.TEXT, text: 'x' },
      }),
      'https://x',
    );
    expect(vars.frase).toBe('<b>Oi</b>');
    expect(vars.img).toBe('https://x/');
    expect(vars).not.toHaveProperty('xpto');
    expect(
      SignatureTemplateHelper.render(content({ frase: { mode: VariableModeEnum.TEXT, text: '<b>Oi</b>' } }), 'https://x', '{{frase}}'),
    ).toBe('&lt;b&gt;Oi&lt;/b&gt;');
  });
});

describe('SignatureTemplateHelper.minify', () => {
  it('modelo indentado gera o mesmo HTML que o compacto', () => {
    const compact = '<table><tr><td style="x">Fulano</td><td><img src="a.png" alt=""><a href="y">site</a></td></tr></table>';
    const indented = [
      '<table>',
      '  <tr>',
      '    <td style="x">',
      '      Fulano',
      '    </td>',
      '    <td>',
      '      <img src="a.png" alt=""><a href="y">site</a>',
      '    </td>',
      '  </tr>',
      '</table>',
    ].join('\n');
    expect(SignatureTemplateHelper.minify(indented)).toBe(compact);
  });

  it('mantém espaço dentro do texto da célula', () => {
    expect(SignatureTemplateHelper.minify('<td>\n  Suporte &nbsp;|&nbsp; Operador\n</td>')).toBe('<td>Suporte &nbsp;|&nbsp; Operador</td>');
  });
});
