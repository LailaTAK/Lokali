// backend/src/test-users.ts

import { updateUserSchema, changePasswordSchema } from './modules/users/users.schema';
import { getUserById, updateUser, uploadAvatar, changePassword, getUserStats } from './modules/users/users.service';
import { getUserController, updateUserController, uploadAvatarController, changePasswordController, getUserStatsController } from './modules/users/users.controller';
import { usersRouter } from './modules/users/users.routes';

console.log('Testing users module files compile and load...');
console.log({
  updateUserSchemaExists: typeof updateUserSchema !== 'undefined',
  getUserByIdExists: typeof getUserById !== 'undefined',
  getUserControllerExists: typeof getUserController !== 'undefined',
  usersRouterExists: typeof usersRouter !== 'undefined',
});
