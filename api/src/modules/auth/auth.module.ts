import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { FirebaseAuthGuard } from './firebase-auth.guard.js';
import { FirebaseCertsStore } from './firebase-certs.store.js';

@Module({
  controllers: [AuthController],
  providers: [FirebaseCertsStore, AuthService, { provide: APP_GUARD, useClass: FirebaseAuthGuard }],
  exports: [AuthService],
})
export class AuthModule {}
