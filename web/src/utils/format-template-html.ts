/**
 * Organiza o HTML do modelo de assinatura: uma linha por tabela/linha/célula, indentado por nível.
 * Texto, imagens, links e variáveis dentro da célula ficam numa linha só (quebrar ali poderia mudar
 * o espaçamento no Gmail). Blocos {{#x}}…{{/x}} entre linhas da tabela ganham linha própria.
 * A API tira a indentação ao gerar a assinatura, então o tamanho no Gmail não muda.
 */
const BLOCK = 'table|tbody|thead|tfoot|tr|td|th|div|p|ul|ol|li|center'
const BLOCK_OPEN = new RegExp(`^<(${BLOCK})\\b`, 'i')
const BLOCK_CLOSE = new RegExp(`^</(${BLOCK})\\s*>$`, 'i')
const SECTION_OPEN = /^\{\{[#^]\s*\w+\s*\}\}$/
const SECTION_CLOSE = /^\{\{\/\s*\w+\s*\}\}$/
const TOKEN =
  /(<!--[\s\S]*?-->|<\/?[a-zA-Z][^>]*>|\{\{[#^/]?\s*\w+\s*\}\}|[^<{]+|[<{])/g

type Kind =
  'open' | 'close' | 'sectionOpen' | 'sectionClose' | 'inline' | 'blank'

export function formatTemplateHtml(source: string, indentUnit = '  '): string {
  const tokens = source.match(TOKEN) ?? []
  const kinds: Kind[] = tokens.map((t) => {
    if (!t.trim()) return 'blank'
    if (BLOCK_CLOSE.test(t)) return 'close'
    if (BLOCK_OPEN.test(t) && !t.endsWith('/>')) return 'open'
    if (SECTION_OPEN.test(t)) return 'sectionOpen'
    if (SECTION_CLOSE.test(t)) return 'sectionClose'
    return 'inline'
  })

  // Bloco {{#x}} é "de linha" quando abre logo antes de uma tag de bloco; {{/x}} quando fecha logo depois de uma.
  const blockSection = new Array<boolean>(tokens.length).fill(false)
  const next = (i: number) => {
    let j = i + 1
    while (j < tokens.length && kinds[j] === 'blank') j++
    return j
  }
  for (let i = tokens.length - 1; i >= 0; i--) {
    if (kinds[i] !== 'sectionOpen') continue
    const j = next(i)
    blockSection[i] =
      j < tokens.length &&
      (kinds[j] === 'open' ||
        kinds[j] === 'close' ||
        (kinds[j] === 'sectionOpen' && blockSection[j]))
  }
  let previous: number | null = null
  for (let i = 0; i < tokens.length; i++) {
    if (kinds[i] === 'blank') continue
    if (kinds[i] === 'sectionClose' && previous !== null) {
      const p = previous
      blockSection[i] =
        kinds[p] === 'close' ||
        kinds[p] === 'open' ||
        ((kinds[p] === 'sectionClose' || kinds[p] === 'sectionOpen') &&
          blockSection[p])
    }
    previous = i
  }

  const lines: string[] = []
  let depth = 0
  let inline = ''
  const pad = () => indentUnit.repeat(depth)
  const flush = () => {
    const text = inline.replace(/\s+/g, ' ').trim()
    if (text) lines.push(pad() + text)
    inline = ''
  }

  tokens.forEach((token, i) => {
    const tag = token.replace(/\s+/g, ' ')
    switch (kinds[i]) {
      case 'open':
        flush()
        lines.push(pad() + tag)
        depth++
        break
      case 'close':
        flush()
        depth = Math.max(0, depth - 1)
        lines.push(pad() + tag)
        break
      case 'sectionOpen':
      case 'sectionClose':
        if (blockSection[i]) {
          flush()
          lines.push(pad() + tag.trim())
        } else {
          inline += tag
        }
        break
      default:
        inline += token
    }
  })
  flush()
  return lines.join('\n')
}
