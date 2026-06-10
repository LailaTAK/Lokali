// backend/src/test-annonces.ts

import { createAnnonceSchema, updateAnnonceSchema, modererAnnonceSchema, searchAnnonceSchema } from './modules/annonces/annonces.schema';
import { checkDisponibilite, createAnnonce, getAnnonces, getAnnonceById, updateAnnonce, deleteAnnonce, modererAnnonce } from './modules/annonces/annonces.service';
import { createAnnonceController, getAnnoncesController, getAnnonceByIdController, updateAnnonceController, deleteAnnonceController, modererAnnonceController } from './modules/annonces/annonces.controller';
import { annoncesRouter } from './modules/annonces/annonces.routes';

console.log('Testing annonces module files compile and load...');
console.log({
  createAnnonceSchemaExists: typeof createAnnonceSchema !== 'undefined',
  checkDisponibiliteExists: typeof checkDisponibilite !== 'undefined',
  createAnnonceControllerExists: typeof createAnnonceController !== 'undefined',
  annoncesRouterExists: typeof annoncesRouter !== 'undefined',
});
