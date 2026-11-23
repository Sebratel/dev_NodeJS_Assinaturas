import { describe, expect, it } from 'vitest'
import { formatTemplateHtml } from './format-template-html'

/** Mesma regra da API (SignatureTemplateHelper.minify): tira a indentação entre tags. */
const minify = (html: string) =>
  html
    .replace(/>\s*\n\s*</g, '><')
    .replace(/>\s*\n\s*/g, '>')
    .replace(/\s*\n\s*</g, '<')
    .replace(/\s*\n\s*/g, ' ')

describe('formatTemplateHtml', () => {
  it('uma linha por tabela/linha/célula, indentado por nível', () => {
    const out = formatTemplateHtml(
      '<table><tr><td style="x">{{nome}}</td></tr></table>'
    )
    expect(out).toBe(
      [
        '<table>',
        '  <tr>',
        '    <td style="x">',
        '      {{nome}}',
        '    </td>',
        '  </tr>',
        '</table>',
      ].join('\n')
    )
  })

  it('bloco {{#x}} entre linhas ganha linha própria; dentro do texto fica junto', () => {
    const out = formatTemplateHtml(
      '<table>{{#frase}}<tr><td>{{setor}}{{#setor}}{{#cargo}} &nbsp;|&nbsp; {{/cargo}}{{/setor}}{{cargo}}</td></tr>{{/frase}}</table>'
    )
    expect(out.split('\n')).toEqual([
      '<table>',
      '  {{#frase}}',
      '  <tr>',
      '    <td>',
      '      {{setor}}{{#setor}}{{#cargo}} &nbsp;|&nbsp; {{/cargo}}{{/setor}}{{cargo}}',
      '    </td>',
      '  </tr>',
      '  {{/frase}}',
      '</table>',
    ])
  })

  it('imagens e links da mesma célula ficam juntos e o resultado sem indentação volta ao original', () => {
    const original =
      '<table><tr><td><img src="a.png" alt=""><a href="x">site</a></td><td width="2"><div style="font-size:0">&#8203;</div></td></tr></table>'
    const formatted = formatTemplateHtml(original)
    expect(formatted).toContain('<img src="a.png" alt=""><a href="x">site</a>')
    expect(minify(formatted)).toBe(original)
  })

  it('organizar duas vezes dá o mesmo resultado', () => {
    const once = formatTemplateHtml('<table><tr><td>{{nome}}</td></tr></table>')
    expect(formatTemplateHtml(once)).toBe(once)
  })
})
