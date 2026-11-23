import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SignatureTemplateEntity } from './entities/signature-template.entity.js';
import { SignatureTemplatesController } from './signature-templates.controller.js';
import { SignatureTemplatesService } from './signature-templates.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([SignatureTemplateEntity])],
  controllers: [SignatureTemplatesController],
  providers: [SignatureTemplatesService],
  exports: [SignatureTemplatesService],
})
export class SignatureTemplatesModule {}
