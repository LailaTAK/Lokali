// backend/src/test-entries.ts

import { app } from './app';
import { initScheduler } from './modules/alertes/alertes.scheduler';

console.log('Testing entry files compile and load...');
console.log({
  appExists: typeof app !== 'undefined',
  initSchedulerExists: typeof initScheduler !== 'undefined',
});
