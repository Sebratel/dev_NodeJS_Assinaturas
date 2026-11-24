import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Put, Res } from '@nestjs/common';
import type { Response } from 'express';
import { RequireRole } from '../auth/auth.decorators.js';
import { ApiResponseHelper } from '../../common/helpers/api-response.helper.js';
import { SavePhraseProfileDTO } from './dto/save-phrase-profile.dto.js';
import { PhraseProfilesService } from './phrase-profiles.service.js';
import { UserRoleEnum } from '../users/types/user-role.enum.js';

@Controller('v1/phrase-profiles')
export class PhraseProfilesController {
  constructor(private readonly phraseProfilesService: PhraseProfilesService) {}

  @Get()
  async findAll() {
    return ApiResponseHelper.ok(await this.phraseProfilesService.findAll());
  }

  @RequireRole(UserRoleEnum.EDITOR)
  @Post()
  async create(@Body() dto: SavePhraseProfileDTO, @Res({ passthrough: true }) response: Response) {
    const profile = await this.phraseProfilesService.create(dto);
    response.status(201).location(`/api/v1/phrase-profiles/${profile.id}`);
    return ApiResponseHelper.ok(profile);
  }

  @RequireRole(UserRoleEnum.EDITOR)
  @Put(':id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SavePhraseProfileDTO) {
    return ApiResponseHelper.ok(await this.phraseProfilesService.update(id, dto));
  }

  @RequireRole(UserRoleEnum.EDITOR)
  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.phraseProfilesService.remove(id);
  }
}
