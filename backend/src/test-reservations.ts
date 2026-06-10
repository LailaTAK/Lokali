// backend/src/test-reservations.ts

import { createReservationSchema, updateStatutSchema } from './modules/reservations/reservations.schema';
import { createReservation, getReservations, getReservationById, updateStatut, getCalendrierLoueur } from './modules/reservations/reservations.service';
import { createReservationController, getReservationsController, getReservationByIdController, updateStatutController, getCalendrierLoueurController } from './modules/reservations/reservations.controller';
import { reservationsRouter } from './modules/reservations/reservations.routes';

console.log('Testing reservations module files compile and load...');
console.log({
  createReservationSchemaExists: typeof createReservationSchema !== 'undefined',
  createReservationExists: typeof createReservation !== 'undefined',
  createReservationControllerExists: typeof createReservationController !== 'undefined',
  reservationsRouterExists: typeof reservationsRouter !== 'undefined',
});
