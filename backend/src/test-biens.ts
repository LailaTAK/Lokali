// backend/src/test-biens.ts

import { createBienSchema, updateBienSchema, filterBiensSchema } from './modules/biens/biens.schema';
import { uploadPhotos, uploadDocument } from './modules/biens/biens.upload';
import { createBien, getBiens, getBienById, updateBien, deleteBien, uploadPhotosService, changerStatut } from './modules/biens/biens.service';
import { createBienController, getBiensController, getBienByIdController, updateBienController, deleteBienController, uploadPhotosController, changerStatutController } from './modules/biens/biens.controller';
import { biensRouter } from './modules/biens/biens.routes';

console.log('Testing biens module files compile and load...');
console.log({
  createBienSchemaExists: typeof createBienSchema !== 'undefined',
  uploadPhotosExists: typeof uploadPhotos !== 'undefined',
  createBienExists: typeof createBien !== 'undefined',
  createBienControllerExists: typeof createBienController !== 'undefined',
  biensRouterExists: typeof biensRouter !== 'undefined',
});
