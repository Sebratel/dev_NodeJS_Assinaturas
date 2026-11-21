import { Module } from '@nestjs/common';
import { DirectoryModule } from '../directory/directory.module.js';
import { SettingsModule } from '../settings/settings.module.js';
import { SignatureRulesModule } from '../signature-rules/signature-rules.module.js';
import { CollaboratorsController } from './collaborators.controller.js';
import { ReportsController } from './reports.controller.js';
import { SignatureEngineService } from './signature-engine.service.js';
import { SignaturesService } from './signatures.service.js';
import { SimulationsController } from './simulations.controller.js';

@Module({
  imports: [DirectoryModule, SignatureRulesModule, SettingsModule],
  controllers: [CollaboratorsController, ReportsController, SimulationsController],
  providers: [SignatureEngineService, SignaturesService],
})
export class SignaturesModule {}
