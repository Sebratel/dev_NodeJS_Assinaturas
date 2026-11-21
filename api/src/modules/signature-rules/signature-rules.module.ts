import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SignatureRuleEntity } from './entities/signature-rule.entity.js';
import { SignatureRulesController } from './signature-rules.controller.js';
import { SignatureRulesService } from './signature-rules.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([SignatureRuleEntity])],
  controllers: [SignatureRulesController],
  providers: [SignatureRulesService],
  exports: [SignatureRulesService],
})
export class SignatureRulesModule {}
