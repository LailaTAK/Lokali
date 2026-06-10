// backend/tests/unit/auth.service.test.ts

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { register, login, refreshTokens, logout } from '../../src/modules/auth/auth.service';
import { prisma } from '../../src/config/database';
import { setEx, del } from '../../src/config/redis';
import { sendWelcomeEmail } from '../../src/config/mailer';
import { createUser } from '../fixtures/user.factory';
import { AppError } from '../../src/middlewares/error.middleware';

// Mock all external configurations and database adapters
jest.mock('../../src/config/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('../../src/config/redis', () => ({
  redis: {
    get: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
  },
  setEx: jest.fn(),
  del: jest.fn(),
}));

jest.mock('../../src/config/mailer', () => ({
  sendWelcomeEmail: jest.fn(),
}));

jest.mock('bcrypt');
jest.mock('jsonwebtoken');

const mockPrismaUser = prisma.user as any;
const mockSetEx = setEx as jest.Mock;
const mockDel = del as jest.Mock;
const mockSendWelcomeEmail = sendWelcomeEmail as jest.Mock;
const mockBcrypt = bcrypt as any;
const mockJwt = jwt as any;

describe('AuthService Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerInput = {
      nom: 'Dupont',
      prenom: 'Jean',
      email: 'jean.dupont@example.com',
      telephone: '+33612345678',
      motDePasse: 'SecretPass123!',
      role: 'CLIENT' as const,
    };

    it('should successfully register a new user, hash password, send email, and return user + tokens', async () => {
      const mockUser = createUser({
        nom: registerInput.nom,
        prenom: registerInput.prenom,
        email: registerInput.email,
        telephone: registerInput.telephone,
        role: registerInput.role,
        actif: true,
      });

      // Stub database return values
      mockPrismaUser.findUnique.mockResolvedValue(null);
      mockPrismaUser.create.mockResolvedValue(mockUser);
      mockPrismaUser.update.mockResolvedValue(mockUser);

      // Stub bcrypt & JWT
      mockBcrypt.hash.mockResolvedValue('hashed_password' as any);
      mockJwt.sign.mockReturnValueOnce('mock_access_token').mockReturnValueOnce('mock_refresh_token');
      mockSendWelcomeEmail.mockResolvedValue(undefined);
      mockSetEx.mockResolvedValue('OK');

      const result = await register(registerInput);

      expect(mockPrismaUser.findUnique).toHaveBeenCalledWith({ where: { email: registerInput.email } });
      expect(mockBcrypt.hash).toHaveBeenCalledWith(registerInput.motDePasse, 12);
      expect(mockPrismaUser.create).toHaveBeenCalled();
      expect(mockSendWelcomeEmail).toHaveBeenCalledWith(mockUser.email, 'Jean Dupont');
      expect(mockSetEx).toHaveBeenCalledWith('token:active:mock_access_token', 15 * 60, mockUser.id);
      
      expect(result.tokens).toEqual({
        accessToken: 'mock_access_token',
        refreshToken: 'mock_refresh_token',
      });
      expect(result.user.email).toBe(registerInput.email);
      expect(result.user).not.toHaveProperty('motDePasse');
    });

    it('should throw 409 Conflict if the email is already registered', async () => {
      const mockUser = createUser({ email: registerInput.email });
      mockPrismaUser.findUnique.mockResolvedValue(mockUser);

      await expect(register(registerInput)).rejects.toThrow(
        new AppError('Cet email est déjà utilisé.', 409)
      );

      expect(mockPrismaUser.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const loginInput = {
      email: 'jean.dupont@example.com',
      motDePasse: 'SecretPass123!',
    };

    it('should successfully log in and return user and tokens', async () => {
      const mockUser = createUser({
        email: loginInput.email,
        motDePasse: 'hashed_password',
        actif: true,
      });

      mockPrismaUser.findUnique.mockResolvedValue(mockUser);
      mockPrismaUser.update.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true as never);
      mockJwt.sign.mockReturnValueOnce('mock_access_token').mockReturnValueOnce('mock_refresh_token');

      const result = await login(loginInput.email, loginInput.motDePasse);

      expect(mockPrismaUser.findUnique).toHaveBeenCalledWith({ where: { email: loginInput.email } });
      expect(mockBcrypt.compare).toHaveBeenCalledWith(loginInput.motDePasse, 'hashed_password');
      expect(mockSetEx).toHaveBeenCalledWith(`user:${mockUser.id}`, 15 * 60, expect.any(String));
      expect(mockSetEx).toHaveBeenCalledWith('token:active:mock_access_token', 15 * 60, mockUser.id);
      
      expect(result.tokens).toEqual({
        accessToken: 'mock_access_token',
        refreshToken: 'mock_refresh_token',
      });
    });

    it('should throw 401 Unauthorized if user email is not found', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(null);

      await expect(login(loginInput.email, loginInput.motDePasse)).rejects.toThrow(
        new AppError('Identifiants incorrects.', 401)
      );
    });

    it('should throw 401 Unauthorized if password verification fails', async () => {
      const mockUser = createUser({ email: loginInput.email, motDePasse: 'hashed_password' });
      mockPrismaUser.findUnique.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(false as never);

      await expect(login(loginInput.email, loginInput.motDePasse)).rejects.toThrow(
        new AppError('Identifiants incorrects.', 401)
      );
    });

    it('should throw 403 Forbidden if user account is deactivated (actif = false)', async () => {
      const mockUser = createUser({
        email: loginInput.email,
        motDePasse: 'hashed_password',
        actif: false,
      });

      mockPrismaUser.findUnique.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true as never);

      await expect(login(loginInput.email, loginInput.motDePasse)).rejects.toThrow(
        new AppError('Ce compte a été désactivé par un administrateur.', 403)
      );
    });
  });

  describe('refreshTokens', () => {
    const rawRefreshToken = 'valid_refresh_token';

    it('should rotate tokens and return a new pair if the token is valid', async () => {
      const mockUser = createUser({
        id: 'user_123',
        actif: true,
        refreshToken: 'hashed_refresh_token',
      });

      mockJwt.verify.mockReturnValue({ id: 'user_123' } as any);
      mockPrismaUser.findUnique.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true as never);
      mockJwt.sign.mockReturnValueOnce('new_access_token').mockReturnValueOnce('new_refresh_token');
      mockPrismaUser.update.mockResolvedValue(mockUser);

      const result = await refreshTokens(rawRefreshToken);

      expect(mockJwt.verify).toHaveBeenCalledWith(rawRefreshToken, expect.any(String));
      expect(mockPrismaUser.findUnique).toHaveBeenCalledWith({ where: { id: 'user_123' } });
      expect(mockBcrypt.compare).toHaveBeenCalledWith(rawRefreshToken, 'hashed_refresh_token');
      expect(result).toEqual({
        accessToken: 'new_access_token',
        refreshToken: 'new_refresh_token',
      });
    });

    it('should throw 401 if refresh token verification throws (token expired/invalid)', async () => {
      mockJwt.verify.mockImplementation(() => {
        throw new Error('Token verification failed');
      });

      await expect(refreshTokens(rawRefreshToken)).rejects.toThrow(
        new AppError('Token de rafraîchissement invalide ou expiré.', 401)
      );
    });
  });

  describe('logout', () => {
    const userId = 'user_123';
    const accessToken = 'active_access_token';

    it('should blacklist the active token, clear db token, and clear Redis caches', async () => {
      mockPrismaUser.update.mockResolvedValue({});
      mockDel.mockResolvedValue(1);
      mockSetEx.mockResolvedValue('OK');

      await logout(userId, accessToken);

      expect(mockSetEx).toHaveBeenCalledWith(`token:blacklist:${accessToken}`, 15 * 60, '1');
      expect(mockDel).toHaveBeenCalledWith(`token:active:${accessToken}`);
      expect(mockPrismaUser.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { refreshToken: null },
      });
      expect(mockDel).toHaveBeenCalledWith(`user:${userId}`);
    });
  });
});

// FICHIER SUIVANT : backend/tests/integration/biens.test.ts
