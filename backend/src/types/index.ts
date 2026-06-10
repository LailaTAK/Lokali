// backend/src/types/index.ts

/**
 * Standard format for all HTTP API responses.
 * 
 * @template T - The structure type of data carried in the response.
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Standard format for all paginated listing HTTP API responses.
 * 
 * @template T - Array item type.
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

/**
 * Interface representing the JWT token bundle returned upon authentication.
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Decoded payload signature found inside JWT tokens.
 */
export interface JwtPayload {
  id: string;
  email: string;
  role: 'CLIENT' | 'LOUEUR' | 'ADMINISTRATEUR';
  iat?: number;
  exp?: number;
}

/**
 * Abstract representation of a file processed via express multer uploads.
 */
export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

/**
 * Custom application exception class used to handle operational (foreseeable)
 * code errors linked to custom HTTP status codes.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  /**
   * AppError constructor.
   * 
   * @param {string} message - Descriptive error message.
   * @param {number} [statusCode=400] - Corresponding HTTP status code.
   * @param {boolean} [isOperational=true] - Marks error as expected/handled.
   */
  constructor(message: string, statusCode = 400, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    // Set prototype explicitly to retain class methods in TS
    Object.setPrototypeOf(this, new.target.prototype);
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// FICHIER SUIVANT : backend/src/app.ts
