import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ApiResponseHelper } from '../../common/helpers/api-response.helper.js';
import { UpdateSettingDTO } from './dto/update-setting.dto.js';
import { SettingsService } from './settings.service.js';

@Controller('v1/settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  async findAll() {
    return ApiResponseHelper.ok(await this.settingsService.findAll());
  }

  @Put(':key')
  async update(@Param('key') key: string, @Body() body: UpdateSettingDTO) {
    return ApiResponseHelper.ok(await this.settingsService.update(key, body.value));
  }
}
