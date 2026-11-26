import { describe, expect, it } from 'vitest';
import { SignatureTemplateHelper } from './signature-template.helper.js';

describe('SignatureTemplateHelper.render', () => {
  it('usa os valores decididos e {{img}} sempre termina em /; valor vindo de regra é escapado', () => {
    const content = { values: { cargo: '', TESTE: '<b>Oi</b>', setor: 'Comercial' }, fieldsUsed: [] };
    expect(SignatureTemplateHelper.render(content, 'https://x', '{{#cargo}}[{{cargo}}]{{/cargo}}{{setor}}|{{TESTE}}|{{img}}')).toBe(
      'Comercial|&lt;b&gt;Oi&lt;/b&gt;|https://x/',
    );
  });
});

describe('SignatureTemplateHelper.renderMap', () => {
  it('mostra cada variável pelo nome no lugar dela, com os blocos abertos e as imagens no endereço certo', () => {
    const tpl = '<img src="{{img}}logo.png">{{nome}}{{#cargo}} | {{cargo}}{{/cargo}}{{^frase}}sem frase{{/frase}}';
    expect(SignatureTemplateHelper.renderMap('https://x', tpl)).toBe(
      '<img src="https://x/logo.png"><span data-sig-var="nome">{{nome}}</span> | <span data-sig-var="cargo">{{cargo}}</span>',
    );
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
