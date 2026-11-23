import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiResponseHelper } from '../../common/helpers/api-response.helper.js';
import { DirectoryService } from '../directory/directory.service.js';
import { PreviewPhraseImportDTO } from './dto/preview-phrase-import.dto.js';
import { DirectoryTeam, TeamNameMatcherHelper } from './team-name-matcher.helper.js';

/**
 * Prévia da importação de frases de uma planilha: liga cada linha a um time do AD.
 * Não grava nada; a tela confirma e salva pela configuração team-phrases.
 */
@Controller('v1/phrase-imports')
export class PhraseImportsController {
  constructor(private readonly directoryService: DirectoryService) {}

  @Post('preview')
  @HttpCode(200)
  async preview(@Body() dto: PreviewPhraseImportDTO) {
    const teams = new Map<string, DirectoryTeam>();
    for (const c of await this.directoryService.findAll()) {
      if (!c.team) continue;
      const key = `${c.area}|${c.team}`;
      const current = teams.get(key) ?? { area: c.area, team: c.team, count: 0 };
      current.count++;
      teams.set(key, current);
    }
    const directoryTeams = [...teams.values()];
    return ApiResponseHelper.ok(
      dto.rows.map((row) => ({
        team: row.team.trim(),
        phrase: row.phrase.trim(),
        tooLong: row.phrase.trim().length > 140,
        ...TeamNameMatcherHelper.match(row.team, directoryTeams),
      })),
    );
  }
}
