// backend/tests/fixtures/user.factory.ts

import { faker } from '@faker-js/faker';

/**
 * Generates a mock CLIENT guest user object.
 * 
 * @param {Partial<any>} [overrides] - Override default generated properties.
 * @returns {any} Guest user data object.
 */
export function createUser(overrides?: Partial<any>): any {
  return {
    id: overrides?.id || faker.string.uuid(),
    nom: overrides?.nom || faker.person.lastName(),
    prenom: overrides?.prenom || faker.person.firstName(),
    email: overrides?.email || faker.internet.email().toLowerCase(),
    telephone: overrides?.telephone || faker.phone.number(),
    motDePasse: overrides?.motDePasse || '$2b$12$MockHashedPasswordStringForTesting12345',
    role: 'CLIENT',
    actif: overrides?.actif !== undefined ? overrides.actif : true,
    adresse: overrides?.adresse || faker.location.streetAddress(),
    photo: overrides?.photo || faker.image.avatar(),
    refreshToken: overrides?.refreshToken || null,
    createdAt: overrides?.createdAt || new Date(),
    updatedAt: overrides?.updatedAt || new Date(),
  };
}

/**
 * Generates a mock LOUEUR host user object.
 */
export function createLoueur(overrides?: Partial<any>): any {
  return {
    ...createUser(overrides),
    role: 'LOUEUR',
    photo: overrides?.photo || faker.image.avatar(),
  };
}

/**
 * Generates a mock ADMINISTRATEUR user object.
 */
export function createAdmin(overrides?: Partial<any>): any {
  return {
    ...createUser(overrides),
    role: 'ADMINISTRATEUR',
  };
}

/**
 * Generates a mock property (Bien) object.
 */
export function createBien(loueurId: string, overrides?: Partial<any>): any {
  return {
    id: overrides?.id || faker.string.uuid(),
    titre: overrides?.titre || `${faker.word.adjective()} Appartement`,
    description: overrides?.description || faker.lorem.paragraph(),
    adresse: overrides?.adresse || faker.location.streetAddress(),
    ville: overrides?.ville || faker.location.city(),
    superficie: overrides?.superficie || faker.number.float({ min: 20, max: 120, multipleOf: 0.1 }),
    nbPieces: overrides?.nbPieces || faker.number.int({ min: 1, max: 5 }),
    loyer: overrides?.loyer || faker.number.float({ min: 400, max: 2000, multipleOf: 50 }),
    type: overrides?.type || faker.helpers.arrayElement(['APPARTEMENT', 'MAISON', 'STUDIO', 'CHAMBRE']),
    equipements: overrides?.equipements || ['Wi-Fi', 'Climatisation', 'Cuisine équipée'],
    lat: overrides?.lat || faker.location.latitude(),
    lng: overrides?.lng || faker.location.longitude(),
    statut: overrides?.statut || 'DISPONIBLE',
    photos: overrides?.photos || [faker.image.urlLoremFlickr({ category: 'apartment' })],
    loueurId,
    deletedAt: overrides?.deletedAt || null,
    createdAt: overrides?.createdAt || new Date(),
    updatedAt: overrides?.updatedAt || new Date(),
  };
}

/**
 * Generates a mock property announcement (Annonce) object.
 */
export function createAnnonce(bienId: string, overrides?: Partial<any>): any {
  return {
    id: overrides?.id || faker.string.uuid(),
    titre: overrides?.titre || `${faker.word.adjective()} Annonce`,
    description: overrides?.description || faker.lorem.paragraph(),
    prixParNuit: overrides?.prixParNuit || faker.number.int({ min: 30, max: 150 }),
    bienId,
    statut: overrides?.statut || 'EN_ATTENTE',
    motifRejet: overrides?.motifRejet || null,
    vues: overrides?.vues || 0,
    createdAt: overrides?.createdAt || new Date(),
    updatedAt: overrides?.updatedAt || new Date(),
  };
}

/**
 * Generates a mock booking reservation object.
 */
export function createReservation(overrides?: Partial<any>): any {
  const checkIn = overrides?.checkIn || faker.date.soon({ days: 10 });
  const checkOut = new Date(checkIn);
  const nbNuits = overrides?.nbNuits || faker.number.int({ min: 2, max: 5 });
  checkOut.setDate(checkOut.getDate() + nbNuits);

  return {
    id: overrides?.id || faker.string.uuid(),
    annonceId: overrides?.annonceId || faker.string.uuid(),
    bienId: overrides?.bienId || faker.string.uuid(),
    clientId: overrides?.clientId || faker.string.uuid(),
    checkIn,
    checkOut,
    nbNuits,
    montantTotal: overrides?.montantTotal || nbNuits * 50,
    statut: overrides?.statut || 'EN_ATTENTE',
    message: overrides?.message || faker.lorem.sentence(),
    rappelEnvoye: overrides?.rappelEnvoye || false,
    createdAt: overrides?.createdAt || new Date(),
    updatedAt: overrides?.updatedAt || new Date(),
  };
}

// FICHIER SUIVANT : backend/tests/unit/auth.service.test.ts
