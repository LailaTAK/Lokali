// backend/src/modules/biens/biens.upload.ts

import { Request } from 'express';
import multer, { FileFilterCallback } from 'multer';
import { AppError } from '../../middlewares/error.middleware';

/**
 * Filter to validate image formats: JPEG, PNG, WEBP.
 */
const imageFileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Format d\'image invalide. Seuls JPG, PNG et WEBP sont acceptés.', 400));
  }
};

/**
 * Filter to validate document formats: PDF.
 */
const docFileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new AppError('Format de document invalide. Seuls les fichiers PDF sont acceptés.', 400));
  }
};

/**
 * Express Middleware: Handle up to 10 photo uploads.
 * File size limit: 5MB per file.
 * Key in form-data: "photos"
 */
export const uploadPhotos = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
  fileFilter: imageFileFilter,
}).array('photos', 10);

/**
 * Express Middleware: Handle a single document upload.
 * File size limit: 10MB.
 * Key in form-data: "document"
 */
export const uploadDocument = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
  fileFilter: docFileFilter,
}).single('document');

// FICHIER SUIVANT : backend/src/modules/biens/biens.service.ts
