import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Put, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiResponseHelper } from '../../common/helpers/api-response.helper.js';
import { SaveSignatureTemplateDTO } from './dto/save-signature-template.dto.js';
import { SignatureTemplatesService } from './signature-templates.service.js';
import { TEMPLATE_VARIABLES } from './template-render.helper.js';

@Controller('v1/signature-templates')
export class SignatureTemplatesController {
  constructor(private readonly signatureTemplatesService: SignatureTemplatesService) {}

  @Get()
  async findAll() {
    return ApiResponseHelper.ok(await this.signatureTemplatesService.findAll());
  }

  /** Declarada antes de ':id'. */
  @Get('variables')
  getVariables() {
    return ApiResponseHelper.ok(TEMPLATE_VARIABLES);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return ApiResponseHelper.ok(await this.signatureTemplatesService.findOne(id));
  }

  @Post()
  async create(@Body() dto: SaveSignatureTemplateDTO, @Res({ passthrough: true }) response: Response) {
    const template = await this.signatureTemplatesService.create(dto);
    response.status(201).location(`/api/v1/signature-templates/${template.id}`);
    return ApiResponseHelper.ok(template);
  }

  @Put(':id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SaveSignatureTemplateDTO) {
    return ApiResponseHelper.ok(await this.signatureTemplatesService.update(id, dto));
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.signatureTemplatesService.remove(id);
  }
}
