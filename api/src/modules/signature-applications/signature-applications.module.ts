import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GoogleIntegrationModule } from '../google-integration/google-integration.module.js';
import { SignaturesModule } from '../signatures/signatures.module.js';
import { SignatureApplicationEntity } from './entities/signature-application.entity.js';
import { SignatureApplicationsController } from './signature-applications.controller.js';
import { SignatureApplicationsService } from './signature-applications.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([SignatureApplicationEntity]), SignaturesModule, GoogleIntegrationModule],
  controllers: [SignatureApplicationsController],
  providers: [SignatureApplicationsService],
})
export class SignatureApplicationsModule {}
