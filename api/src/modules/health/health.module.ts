import { Module } from '@nestjs/common';
import { DirectoryModule } from '../directory/directory.module.js';
import { HealthController } from './health.controller.js';

@Module({ imports: [DirectoryModule], controllers: [HealthController] })
export class HealthModule {}
