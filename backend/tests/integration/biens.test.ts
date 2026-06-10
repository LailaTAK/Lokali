// backend/tests/integration/biens.test.ts

import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/app';
import { prisma } from '../../src/config/database';
import { createBien, createLoueur, createUser } from '../fixtures/user.factory';

// Mock the database client singleton
jest.mock('../../src/config/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    bien: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    annonce: {
      findMany: jest.fn(),
    },
    reservation: {
      count: jest.fn(),
    },
    avis: {
      aggregate: jest.fn(),
    },
  },
}));

// Mock Redis client cache connection helpers
jest.mock('../../src/config/redis', () => ({
  redis: {
    get: jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    incr: jest.fn().mockResolvedValue(1),
    ttl: jest.fn().mockResolvedValue(900),
    expire: jest.fn().mockResolvedValue(true),
  },
  get: jest.fn().mockResolvedValue(null),
  setEx: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
}));

// Mock Mapbox Geocoder functions
jest.mock('../../src/utils/geocoder', () => ({
  geocodeAddress: jest.fn().mockResolvedValue({ lat: 48.8566, lng: 2.3522 }),
}));

jest.mock('jsonwebtoken');

const mockPrismaUser = prisma.user as any;
const mockPrismaBien = prisma.bien as any;
const mockPrismaAnnonce = prisma.annonce as any;
const mockPrismaReservation = prisma.reservation as any;
const mockPrismaAvis = prisma.avis as any;
const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe('Biens Module Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/biens', () => {
    it('should return a paginated list of properties (200 OK)', async () => {
      const mockHost = createLoueur({ id: 'loueur_1' });
      const mockList = [
        createBien(mockHost.id, { id: 'bien_1', ville: 'Paris' }),
        createBien(mockHost.id, { id: 'bien_2', ville: 'Paris' }),
      ];

      mockPrismaBien.findMany.mockResolvedValue(
        mockList.map((b) => ({ ...b, loueur: { id: mockHost.id, nom: mockHost.nom, prenom: mockHost.prenom } }))
      );
      mockPrismaBien.count.mockResolvedValue(2);

      const response = await request(app)
        .get('/api/biens')
        .query({ ville: 'Paris', limit: 10, page: 1 });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.meta).toEqual({
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      });
    });
  });

  describe('POST /api/biens', () => {
    const validBienPayload = {
      titre: 'Magnifique duplex',
      description: 'Superbe duplex tout confort situé en plein coeur de la ville.',
      adresse: '12 Rue de la Paix',
      ville: 'Paris',
      superficie: 45,
      nbPieces: 2,
      loyer: 1200,
      type: 'APPARTEMENT',
      equipements: ['Wi-Fi', 'Climatisation'],
    };

    it('should block creation and return 401 Unauthorized if auth token is missing', async () => {
      const response = await request(app)
        .post('/api/biens')
        .send(validBienPayload);

      expect(response.status).toBe(401);
    });

    it('should block creation and return 403 Forbidden if user is a CLIENT (only LOUEUR allowed)', async () => {
      const mockClient = createUser({ id: 'client_1', role: 'CLIENT' });
      mockJwt.verify.mockReturnValue({ id: mockClient.id, email: mockClient.email, role: mockClient.role } as any);
      mockPrismaUser.findUnique.mockResolvedValue(mockClient);

      const response = await request(app)
        .post('/api/biens')
        .set('Authorization', 'Bearer valid_client_token')
        .send(validBienPayload);

      expect(response.status).toBe(403);
    });

    it('should successfully create a new property and return 201 Created for authenticated LOUEUR', async () => {
      const mockHost = createLoueur({ id: 'loueur_1', role: 'LOUEUR' });
      const createdBien = createBien(mockHost.id, { id: 'bien_1', ...validBienPayload });

      mockJwt.verify.mockReturnValue({ id: mockHost.id, email: mockHost.email, role: mockHost.role } as any);
      mockPrismaUser.findUnique.mockResolvedValue(mockHost);
      mockPrismaBien.create.mockResolvedValue(createdBien);

      const response = await request(app)
        .post('/api/biens')
        .set('Authorization', 'Bearer valid_host_token')
        .send(validBienPayload);

      expect(response.status).toBe(201);
      expect(response.body.titre).toBe(validBienPayload.titre);
      expect(mockPrismaBien.create).toHaveBeenCalled();
    });

    it('should reject creation and return 422 Unprocessable Entity if parameters are invalid', async () => {
      const mockHost = createLoueur({ id: 'loueur_1' });
      mockJwt.verify.mockReturnValue({ id: mockHost.id, email: mockHost.email, role: mockHost.role } as any);
      mockPrismaUser.findUnique.mockResolvedValue(mockHost);

      const invalidPayload = { ...validBienPayload, loyer: -50 }; // negative rent is invalid

      const response = await request(app)
        .post('/api/biens')
        .set('Authorization', 'Bearer valid_host_token')
        .send(invalidPayload);

      expect(response.status).toBe(422);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('GET /api/biens/:id', () => {
    it('should return property details (200 OK) if it exists', async () => {
      const mockHost = createLoueur({ id: 'loueur_1' });
      const mockProperty = createBien(mockHost.id, { id: 'bien_1' });

      mockPrismaBien.findUnique.mockResolvedValue({
        ...mockProperty,
        loueur: { id: mockHost.id, nom: mockHost.nom, prenom: mockHost.prenom, photo: mockHost.photo },
      });
      mockPrismaAnnonce.findMany.mockResolvedValue([]);
      mockPrismaReservation.count.mockResolvedValue(5);
      mockPrismaAvis.aggregate.mockResolvedValue({ _avg: { note: 4.8 }, _count: { id: 10 } });

      const response = await request(app).get('/api/biens/bien_1');

      expect(response.status).toBe(200);
      expect(response.body.bien.id).toBe('bien_1');
      expect(response.body.stats).toEqual({
        totalReservations: 5,
        averageRating: 4.8,
        reviewsCount: 10,
      });
    });

    it('should return 404 Not Found if property does not exist', async () => {
      mockPrismaBien.findUnique.mockResolvedValue(null);

      const response = await request(app).get('/api/biens/non_existing_id');

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/biens/:id', () => {
    const updatePayload = { titre: 'Nouveau titre mis à jour' };

    it('should update property details if requested by the owner LOUEUR (200 OK)', async () => {
      const mockHost = createLoueur({ id: 'loueur_owner' });
      const mockProperty = createBien(mockHost.id, { id: 'bien_1' });
      const updatedProperty = { ...mockProperty, ...updatePayload };

      mockJwt.verify.mockReturnValue({ id: mockHost.id, email: mockHost.email, role: mockHost.role } as any);
      mockPrismaUser.findUnique.mockResolvedValue(mockHost);
      mockPrismaBien.findUnique.mockResolvedValue(mockProperty);
      mockPrismaBien.update.mockResolvedValue(updatedProperty);

      const response = await request(app)
        .put('/api/biens/bien_1')
        .set('Authorization', 'Bearer valid_host_token')
        .send(updatePayload);

      expect(response.status).toBe(200);
      expect(response.body.titre).toBe(updatePayload.titre);
      expect(mockPrismaBien.update).toHaveBeenCalled();
    });

    it('should reject updates and return 403 Forbidden if requested by another LOUEUR user', async () => {
      const mockOwner = createLoueur({ id: 'owner_id' });
      const mockAnotherHost = createLoueur({ id: 'another_host_id' });
      const mockProperty = createBien(mockOwner.id, { id: 'bien_1' });

      mockJwt.verify.mockReturnValue({ id: mockAnotherHost.id, email: mockAnotherHost.email, role: mockAnotherHost.role } as any);
      mockPrismaUser.findUnique.mockResolvedValue(mockAnotherHost);
      mockPrismaBien.findUnique.mockResolvedValue(mockProperty);

      const response = await request(app)
        .put('/api/biens/bien_1')
        .set('Authorization', 'Bearer valid_host_token')
        .send(updatePayload);

      expect(response.status).toBe(403);
      expect(mockPrismaBien.update).not.toHaveBeenCalled();
    });
  });
});

// FICHIER SUIVANT : backend/package.json
