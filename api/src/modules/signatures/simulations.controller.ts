import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiResponseHelper } from '../../common/helpers/api-response.helper.js';
import { SimulateSignatureRuleDTO } from './dto/simulate-signature-rule.dto.js';
import { SignaturesService } from './signatures.service.js';

/** Simulação não grava nada: responde 200, não 201. */
@Controller('v1/simulations')
export class SimulationsController {
  constructor(private readonly signaturesService: SignaturesService) {}

  @Post()
  @HttpCode(200)
  async simulate(@Body() draft: SimulateSignatureRuleDTO) {
    return ApiResponseHelper.ok(await this.signaturesService.simulate(draft));
  }
}
