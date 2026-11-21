import { Module } from '@nestjs/common';
import { GoogleIntegrationController } from './google-integration.controller.js';

@Module({ controllers: [GoogleIntegrationController] })
export class GoogleIntegrationModule {}
