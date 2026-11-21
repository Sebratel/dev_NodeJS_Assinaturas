import { Body, Controller, Get, Param, Put, Query } from '@nestjs/common';
import { ApiResponseHelper } from '../../common/helpers/api-response.helper.js';
import { DirectoryService } from '../directory/directory.service.js';
import { ListCollaboratorsQueryDTO } from './dto/list-collaborators-query.dto.js';
import { UpdateInformedMobileDTO } from './dto/update-informed-mobile.dto.js';
import { SignaturesService } from './signatures.service.js';

@Controller('v1/collaborators')
export class CollaboratorsController {
  constructor(
    private readonly signaturesService: SignaturesService,
    private readonly directoryService: DirectoryService,
  ) {}

  @Get()
  async findAll(@Query() query: ListCollaboratorsQueryDTO) {
    const items = await this.signaturesService.listCollaborators(query);
    return ApiResponseHelper.paginate(items, query.page, query.pageSize);
  }

  /** Declarada antes de ':id' para não ser engolida por ela. */
  @Get('facets')
  async getFacets() {
    return ApiResponseHelper.ok(await this.signaturesService.getFacets());
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return ApiResponseHelper.ok(await this.signaturesService.getCollaboratorSignature(id));
  }

  @Put(':id/informed-mobile')
  async updateInformedMobile(@Param('id') id: string, @Body() dto: UpdateInformedMobileDTO) {
    await this.directoryService.setInformedMobile(id, dto.informedMobile);
    return ApiResponseHelper.ok(await this.signaturesService.getCollaboratorSignature(id));
  }
}
