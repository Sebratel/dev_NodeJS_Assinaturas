import { Controller, Get } from '@nestjs/common';
import { ApiResponseHelper } from '../../common/helpers/api-response.helper.js';
import { SignaturesService } from './signatures.service.js';

@Controller('v1/reports')
export class ReportsController {
  constructor(private readonly signaturesService: SignaturesService) {}

  @Get('coverage')
  async getCoverage() {
    return ApiResponseHelper.ok(await this.signaturesService.getCoverage());
  }
}
