import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Put, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiResponseHelper } from '../../common/helpers/api-response.helper.js';
import { CreateSignatureRuleDTO } from './dto/create-signature-rule.dto.js';
import { UpdateSignatureRuleDTO } from './dto/update-signature-rule.dto.js';
import { SignatureRulesService } from './signature-rules.service.js';

@Controller('v1/signature-rules')
export class SignatureRulesController {
  constructor(private readonly signatureRulesService: SignatureRulesService) {}

  @Get()
  async findAll() {
    return ApiResponseHelper.ok(await this.signatureRulesService.findAll());
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return ApiResponseHelper.ok(await this.signatureRulesService.findOne(id));
  }

  @Post()
  async create(@Body() dto: CreateSignatureRuleDTO, @Res({ passthrough: true }) response: Response) {
    const rule = await this.signatureRulesService.create(dto);
    response.status(201).location(`/api/v1/signature-rules/${rule.id}`);
    return ApiResponseHelper.ok(rule);
  }

  @Put(':id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSignatureRuleDTO) {
    return ApiResponseHelper.ok(await this.signatureRulesService.update(id, dto));
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.signatureRulesService.remove(id);
  }
}
