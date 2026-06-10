// backend/src/test-alertes.ts

import { createAlerte, getAlertes, marquerLue, marquerToutesLues, getNombreNonLues, sendPushNotification } from './modules/alertes/alertes.service';
import { alertesWorker } from './modules/alertes/alertes.worker';
import { initScheduler } from './modules/alertes/alertes.scheduler';

console.log('Testing alertes module files compile and load...');
console.log({
  createAlerteExists: typeof createAlerte !== 'undefined',
  alertesWorkerExists: typeof alertesWorker !== 'undefined',
  initSchedulerExists: typeof initScheduler !== 'undefined',
});
