import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { FirebaseAuthGuard } from './firebase-auth.guard.js';
import { FirebaseCertsStore } from './firebase-certs.store.js';
import { HubAuthController } from './hub-auth.controller.js';
import { HubSsoService } from './hub-sso.service.js';

@Module({
  imports: [UsersModule],
  controllers: [AuthController, HubAuthController],
  providers: [FirebaseCertsStore, HubSsoService, AuthService, { provide: APP_GUARD, useClass: FirebaseAuthGuard }],
  exports: [AuthService],
})
export class AuthModule {}
