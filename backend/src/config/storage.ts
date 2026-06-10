// backend/src/config/storage.ts

import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl as getS3SignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import { env } from './env';

/**
 * AWS S3 Client instance configured with validated environment variables.
 */
export const s3Client = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

/**
 * List of allowed MIME types for file uploads.
 */
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
];

/**
 * Maximum file size allowed for uploads (10 MB in bytes).
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Uploads a file buffer to AWS S3. Validates MIME type and file size.
 * 
 * @param {Express.Multer.File} file - The file object from Multer.
 * @returns {Promise<string>} The unique key of the uploaded file on S3.
 * @throws {Error} If the file size is too large or the MIME type is invalid.
 */
export async function uploadFile(file: Express.Multer.File): Promise<string> {
  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File is too large. Max size allowed is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`);
  }

  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    throw new Error(`Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`);
  }

  // Generate a unique object key on S3
  const fileExtension = file.originalname.split('.').pop() || '';
  const randomBytes = crypto.randomBytes(16).toString('hex');
  const key = `uploads/${Date.now()}-${randomBytes}.${fileExtension}`;

  const command = new PutObjectCommand({
    Bucket: env.AWS_S3_BUCKET,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  });

  try {
    await s3Client.send(command);
    return key;
  } catch (error) {
    console.error('❌ S3 File Upload Failed:', error);
    throw new Error('Could not upload file to cloud storage.');
  }
}

/**
 * Deletes a file from AWS S3 using its key.
 * 
 * @param {string} key - The S3 object key.
 * @returns {Promise<void>}
 */
export async function deleteFile(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: env.AWS_S3_BUCKET,
    Key: key,
  });

  try {
    await s3Client.send(command);
    console.log(`🗑️ Successfully deleted file from S3: ${key}`);
  } catch (error) {
    console.error(`❌ S3 File Deletion Failed for key "${key}":`, error);
    throw new Error('Could not delete file from cloud storage.');
  }
}

/**
 * Generates a presigned URL for downloading/viewing a file from S3.
 * 
 * @param {string} key - The S3 object key.
 * @param {number} [expiresIn=3600] - Expiration time in seconds (default is 1 hour).
 * @returns {Promise<string>} The pre-signed read URL.
 */
export async function getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: env.AWS_S3_BUCKET,
    Key: key,
  });

  try {
    return await getS3SignedUrl(s3Client, command, { expiresIn });
  } catch (error) {
    console.error(`❌ S3 Presigned URL Generation Failed for key "${key}":`, error);
    throw new Error('Could not generate secure file URL.');
  }
}

/**
 * Uploads a raw file buffer to AWS S3.
 * 
 * @param {Buffer} buffer - The raw binary buffer of the file.
 * @param {string} key - The S3 object key where the file should be stored.
 * @param {string} contentType - The MIME content type of the file.
 * @returns {Promise<string>} The key of the uploaded file.
 */
export async function uploadBuffer(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: env.AWS_S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  try {
    await s3Client.send(command);
    return key;
  } catch (error) {
    console.error(`❌ S3 Buffer Upload Failed for key "${key}":`, error);
    throw new Error('Could not upload binary file to cloud storage.');
  }
}

// FICHIER SUIVANT : backend/src/config/mailer.ts
