import { describe, expect, it } from 'vitest';
import { SignatureTemplateHelper } from './signature-template.helper.js';

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
