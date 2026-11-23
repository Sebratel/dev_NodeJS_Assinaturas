/**
 * Lê colunas coladas do Google Sheets/Excel (tabulação entre colunas). Aceita:
 * - com cabeçalho: acha as colunas "TIME" e "FRASE…" (ex.: GESTOR | TIME | Frase E-mail);
 * - sem cabeçalho: 2 colunas = time, frase; 3 ou mais = gestor, time, frase.
 * Linhas sem frase e times repetidos (fica o primeiro) são ignorados.
 */
export function parsePhraseTable(
  text: string
): Array<{ team: string; phrase: string }> {
  const rows: Array<{ team: string; phrase: string }> = []
  const seen = new Set<string>()
  let teamCol = -1
  let phraseCol = -1

  for (const line of text.split(/\r?\n/)) {
    const cells = line
      .split('\t')
      .map((c) => c.trim().replace(/^"|"$/g, '').trim())
    if (cells.every((c) => !c)) continue

    const headerTeam = cells.findIndex((c) => /^time$/i.test(c))
    const headerPhrase = cells.findIndex((c) => /^frase/i.test(c))
    if (headerTeam >= 0 && headerPhrase >= 0) {
      teamCol = headerTeam
      phraseCol = headerPhrase
      continue
    }

    const [t, p] =
      teamCol >= 0 ? [teamCol, phraseCol] : cells.length >= 3 ? [1, 2] : [0, 1]
    const team = cells[t] ?? ''
    const phrase = cells[p] ?? ''
    const key = team.toLowerCase()
    if (!team || !phrase || seen.has(key)) continue
    seen.add(key)
    rows.push({ team, phrase })
  }
  return rows
}
