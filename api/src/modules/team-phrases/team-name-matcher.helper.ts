import { TextHelper } from '../../common/helpers/text.helper.js';

export interface DirectoryTeam {
  area: string;
  team: string;
  count: number;
}

export type MatchConfidence = 'EXACT' | 'PROBABLE' | 'NONE';

export interface TeamMatch {
  confidence: MatchConfidence;
  best: (DirectoryTeam & { score: number }) | null;
  /** Times com o mesmo nome em outras áreas (ex.: Auditoria na Técnica e no Comercial). */
  sameNameElsewhere: DirectoryTeam[];
  candidates: Array<DirectoryTeam & { score: number }>;
}

/** Abreviações usadas nos nomes de OU do AD → palavra completa (como na planilha do RH). */
const ABBREVIATIONS: Record<string, string> = {
  manut: 'manutencao',
  implan: 'implantacao',
  infra: 'infraestrutura',
  inst: 'instalacao',
  desenv: 'desenvolvimento',
  oper: 'operacional',
  dp: 'departamento pessoal',
  mkt: 'marketing',
  pdv: 'ponto venda',
  cgr: 'centro gerenciamento redes',
  cor: 'centro operacional rede',
  gerencia: 'gerenciamento',
  cond: 'condominios',
  corp: 'corporativo',
  dev: 'desenvolvimento',
};
const STOPWORDS = new Set(['de', 'do', 'da', 'dos', 'das', 'e', 'a', 'o', 'em', 'sistemas']);
/** Singular/plural e variações curtas que aparecem entre AD e planilha. */
const STEMS: Array<[RegExp, string]> = [
  [/^redes$/, 'rede'],
  [/^condominio$/, 'condominios'],
  [/^vendas$/, 'venda'],
];

/**
 * Liga o nome de time de uma planilha ao time do AD. Normaliza (minúsculas, sem acento, sem pontuação),
 * expande abreviações das OUs e compara conjuntos de palavras (Dice), olhando o time e "área + time".
 */
export class TeamNameMatcherHelper {
  static tokens(text: string): Set<string> {
    const words = TextHelper.normalize(text)
      .replace(/[^a-z0-9 ]+/g, ' ')
      .split(' ')
      .filter(Boolean)
      .flatMap((w) => (ABBREVIATIONS[w] ?? w).split(' '))
      .map((w) => STEMS.reduce((acc, [re, to]) => acc.replace(re, to), w))
      .filter((w) => !STOPWORDS.has(w));
    return new Set(words);
  }

  static dice(a: Set<string>, b: Set<string>): number {
    if (!a.size || !b.size) return 0;
    let common = 0;
    a.forEach((w) => b.has(w) && common++);
    return (2 * common) / (a.size + b.size);
  }

  static match(sheetTeam: string, directoryTeams: DirectoryTeam[]): TeamMatch {
    const wanted = TeamNameMatcherHelper.tokens(sheetTeam);
    const scored = directoryTeams
      .map((t) => {
        const byTeam = TeamNameMatcherHelper.dice(wanted, TeamNameMatcherHelper.tokens(t.team));
        const byAreaTeam = TeamNameMatcherHelper.dice(wanted, TeamNameMatcherHelper.tokens(`${t.area} ${t.team}`));
        return { ...t, score: Math.max(byTeam, byAreaTeam) };
      })
      .filter((t) => t.score > 0)
      .sort((a, b) => b.score - a.score || b.count - a.count);

    const best = scored[0] ?? null;
    const confidence: MatchConfidence = !best ? 'NONE' : best.score >= 0.999 ? 'EXACT' : best.score >= 0.6 ? 'PROBABLE' : 'NONE';
    const sameNameElsewhere = best
      ? scored.filter((t) => t !== best && t.score >= best.score - 0.001 && TextHelper.normalize(t.team) === TextHelper.normalize(best.team))
      : [];
    return {
      confidence,
      best: confidence === 'NONE' ? null : best,
      sameNameElsewhere: sameNameElsewhere.map(({ score: _score, ...t }) => t),
      candidates: scored.slice(0, 5),
    };
  }
}
