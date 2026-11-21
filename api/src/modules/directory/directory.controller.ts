import { Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiResponseHelper } from '../../common/helpers/api-response.helper.js';
import { DirectoryService } from './directory.service.js';

@Controller('v1/directory')
export class DirectoryController {
  constructor(private readonly directoryService: DirectoryService) {}

  @Get('status')
  async getStatus() {
    return ApiResponseHelper.ok(await this.directoryService.getStatus());
  }

  @Post('sync')
  @HttpCode(200)
  async sync() {
    return ApiResponseHelper.ok(await this.directoryService.sync());
  }
}
