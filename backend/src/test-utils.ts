// backend/src/test-utils.ts

import { logger, httpLogger } from './utils/logger';
import { parsePagination, buildPaginatedResponse } from './utils/pagination';
import { geocodeAddress, reverseGeocode, calculateDistance } from './utils/geocoder';
import { generateRecuPaiement, generateAndUploadRecu } from './utils/pdf.generator';

console.log('Testing utility files compile and load...');
console.log({
  loggerExists: typeof logger !== 'undefined',
  httpLoggerExists: typeof httpLogger !== 'undefined',
  parsePaginationExists: typeof parsePagination !== 'undefined',
  geocodeAddressExists: typeof geocodeAddress !== 'undefined',
  pdfGeneratorExists: typeof generateRecuPaiement !== 'undefined',
});
