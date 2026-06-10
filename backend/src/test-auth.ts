// backend/src/test-auth.ts

import { registerSchema, loginSchema, refreshSchema } from './modules/auth/auth.schema';
import { register, login, refreshTokens, logout } from './modules/auth/auth.service';
import { registerController, loginController, refreshController, logoutController } from './modules/auth/auth.controller';
import { authRouter } from './modules/auth/auth.routes';

console.log('Testing auth module files compile and load...');
console.log({
  registerSchemaExists: typeof registerSchema !== 'undefined',
  registerExists: typeof register !== 'undefined',
  registerControllerExists: typeof registerController !== 'undefined',
  authRouterExists: typeof authRouter !== 'undefined',
});
