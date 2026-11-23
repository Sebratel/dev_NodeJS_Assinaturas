import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiResponseHelper } from '../../common/helpers/api-response.helper.js';
import { PreviewTemplateDTO } from './dto/preview-template.dto.js';
import { SignaturesService } from './signatures.service.js';

/** Prévia de modelo com dados reais. Não grava nada: 200. */
@Controller('v1/template-previews')
export class TemplatePreviewsController {
  constructor(private readonly signaturesService: SignaturesService) {}

  @Post()
  @HttpCode(200)
  async preview(@Body() dto: PreviewTemplateDTO) {
    return ApiResponseHelper.ok(await this.signaturesService.previewTemplate(dto.html, dto.collaboratorId));
  }
}
