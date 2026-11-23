import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiResponseHelper } from '../../common/helpers/api-response.helper.js';
import { CreateApplicationBatchDTO } from './dto/create-application-batch.dto.js';
import { SignatureApplicationsService } from './signature-applications.service.js';

@Controller('v1/signature-applications')
export class SignatureApplicationsController {
  constructor(private readonly signatureApplicationsService: SignatureApplicationsService) {}

  /** Começa a gravar no Gmail e devolve o lote; o andamento sai em GET batches/:id. */
  @Post('batches')
  @HttpCode(202)
  async startBatch(@Body() dto: CreateApplicationBatchDTO) {
    return ApiResponseHelper.ok(await this.signatureApplicationsService.startBatch(dto));
  }

  @Get('batches/:id')
  getBatch(@Param('id', ParseUUIDPipe) id: string) {
    return ApiResponseHelper.ok(this.signatureApplicationsService.getBatch(id));
  }

  @Get()
  async findHistory(@Query('collaboratorId') collaboratorId?: string) {
    return ApiResponseHelper.ok(await this.signatureApplicationsService.findHistory(collaboratorId));
  }

  @Post(':id/restore')
  @HttpCode(200)
  async restore(@Param('id', ParseUUIDPipe) id: string) {
    return ApiResponseHelper.ok(await this.signatureApplicationsService.restore(id));
  }
}
