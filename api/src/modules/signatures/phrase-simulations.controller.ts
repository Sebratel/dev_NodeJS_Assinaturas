import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiResponseHelper } from '../../common/helpers/api-response.helper.js';
import { SavePhraseProfileDTO } from '../phrase-profiles/dto/save-phrase-profile.dto.js';
import { SignaturesService } from './signatures.service.js';

/** Efeito de um perfil de frase antes de salvar. Não grava nada: 200. */
@Controller('v1/phrase-simulations')
export class PhraseSimulationsController {
  constructor(private readonly signaturesService: SignaturesService) {}

  @Post()
  @HttpCode(200)
  async simulate(@Body() draft: SavePhraseProfileDTO) {
    return ApiResponseHelper.ok(await this.signaturesService.simulatePhraseProfile(draft));
  }
}
