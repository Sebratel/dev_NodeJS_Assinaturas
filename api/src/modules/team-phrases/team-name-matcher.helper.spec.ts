import { describe, expect, it } from 'vitest';
import { DirectoryTeam, TeamNameMatcherHelper } from './team-name-matcher.helper.js';

// Times como estão no AD (derivados de "Grupo <Área> - <Time>") em 23/11/2026.
const AD: DirectoryTeam[] = [
  ['Técnica', 'Manut Fttx'], ['Técnica', 'Instalação Fttx'], ['Técnica', 'Suporte Técnico'], ['Administrativo', 'Dp'],
  ['Marketing', 'Mkt'], ['Comercial', 'Pdv'], ['Técnica', 'Cgr - Centro De Gerencia De Redes'], ['Técnica', 'Cor - Centro De Oper De Rede'],
  ['Técnica', 'Infra Implan - Backbone'], ['Técnica', 'Infra Manut - Geral'], ['Técnica', 'Infra Manut - Corp Cond'], ['TI', 'Desenvolvimento'],
  ['Ti-Help Desk', 'Ti'], ['Ti-Infraestrutura', 'Ti'], ['Técnica', 'Infraestrutura'], ['Técnica', 'Auditoria'], ['Comercial', 'Auditoria'],
  ['Técnica', 'Treinamento E Desenv Técnico'], ['Desenv Humano', 'Dho'], ['Comercial', 'Corporativo'], ['Técnica', 'Operacional'],
].map(([area, team]) => ({ area, team, count: 3 }));

const best = (name: string) => TeamNameMatcherHelper.match(name, AD);

describe('TeamNameMatcherHelper', () => {
  it.each([
    ['MANUTENÇÃO FTTX', 'Manut Fttx'],
    ['INSTALAÇÃO FTTX', 'Instalação Fttx'],
    ['DEPARTAMENTO PESSOAL', 'Dp'],
    ['MARKETING', 'Mkt'],
    ['PDV - PONTO DE VENDA', 'Pdv'],
    ['COR/CENTRO OPERACIONAL DE REDE', 'Cor - Centro De Oper De Rede'],
    ['INFRAESTRUTURA IMPLANTAÇÃO/BACKBONE', 'Infra Implan - Backbone'],
    ['INFRAESTRUTURA MANUTENÇÃO/GERAL', 'Infra Manut - Geral'],
    ['TREINAMENTO E DESENVOLVIMENTO TÉCNICO', 'Treinamento E Desenv Técnico'],
    ['OPERACIONAL', 'Operacional'],
  ])('"%s" → %s com certeza', (sheet, team) => {
    const match = best(sheet);
    expect(match.confidence).toBe('EXACT');
    expect(match.best?.team).toBe(team);
  });

  it('separa TI/HELP DESK e TI/INFRAESTRUTURA pela área (o time no AD se chama só "Ti" nos dois)', () => {
    expect(best('TI/HELP DESK').best).toMatchObject({ area: 'Ti-Help Desk', team: 'Ti' });
    expect(best('TI/INFRAESTRUTURA').best).toMatchObject({ area: 'Ti-Infraestrutura', team: 'Ti' });
  });

  it('nome parecido mas não igual fica como "provável" para alguém conferir', () => {
    expect(best('CGR/CENTRO DE GERENCIAMENTO DE REDES').best?.team).toBe('Cgr - Centro De Gerencia De Redes');
    expect(best('INFRAESTRUTURA CONDOMÍNIOS')).toMatchObject({ confidence: 'PROBABLE', best: { team: 'Infra Manut - Corp Cond' } });
    expect(best('DESENVOLVIMENTO DE SISTEMAS (DEV)').best).toMatchObject({ area: 'TI', team: 'Desenvolvimento' });
  });

  it('avisa quando o mesmo time existe em mais de uma área', () => {
    const match = best('AUDITORIA');
    expect(match.confidence).toBe('EXACT');
    expect(match.sameNameElsewhere).toHaveLength(1);
  });

  it('time que não existe no AD fica sem correspondência', () => {
    expect(best('FISCAL').confidence).toBe('NONE');
    expect(best('EDUCACÃO CORPORATIVA').confidence).toBe('NONE');
    expect(best('ATRAÇÃO E SELECAO').confidence).toBe('NONE');
  });
});
