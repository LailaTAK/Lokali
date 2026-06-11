// backend/src/modules/biens/biens.service.ts

import { prisma } from '../../config/database';
import { geocodeAddress } from '../../utils/geocoder';
import { uploadFile, getSignedUrl } from '../../config/storage';
import { AppError } from '../../middlewares/error.middleware';
import { parsePagination, buildPaginatedResponse, PaginatedResponse } from '../../utils/pagination';
import { CreateBienInput, UpdateBienInput, FilterBiensInput } from './biens.schema';
import { UserPayload } from '../../middlewares/auth.middleware';

export interface BienDetailResponse {
  bien: any;
  annonces: any[];
  stats: {
    totalReservations: number;
    averageRating: number;
    reviewsCount: number;
  };
}

/**
 * Creates a new property listing.
 * Automatically geocodes the physical address to retrieve latitude and longitude.
 * 
 * @param {string} loueurId - The ID of the LOUEUR user publishing the property.
 * @param {CreateBienInput} data - The validated property parameters.
 * @returns {Promise<any>} The created property record.
 */
export async function createBien(loueurId: string, data: CreateBienInput): Promise<any> {
  // 1. Geocode the address to find GPS coordinates
  let coords;
  try {
    coords = await geocodeAddress(`${data.adresse}, ${data.ville}`);
  } catch (error: any) {
    throw new AppError(
      `Impossible de localiser cette adresse. Vérifiez l'adresse ou configurez MAPBOX_TOKEN. Détail: ${error.message}`,
      400
    );
  }

  // 2. Insert the property in the database
  const bien = await prisma.bien.create({
    data: {
      titre: data.titre,
      description: data.description,
      adresse: data.adresse,
      ville: data.ville,
      superficie: data.superficie,
      nbPieces: data.nbPieces,
      loyer: data.loyer,
      type: data.type,
      equipements: data.equipements,
      lat: coords.lat,
      lng: coords.lng,
      statut: 'DISPONIBLE',
      photos: [],
      loueurId,
    },
  });

  return bien;
}

/**
 * Retrieves a paginated list of properties matching filters.
 * Implements raw SQL Haversine formula to filter properties within a geographic radius in kilometers.
 * 
 * @param {FilterBiensInput} filters - The search filter arguments.
 * @returns {Promise<PaginatedResponse<any>>} Paginated result.
 */
export async function getBiens(
  filters: FilterBiensInput,
  currentUser?: UserPayload
): Promise<PaginatedResponse<any>> {
  const { page, limit, skip } = parsePagination({ page: filters.page, limit: filters.limit });
  const showOnlyReservable = !currentUser || currentUser.role === 'CLIENT';

  // 1. Resolve raw SQL Haversine filter if lat, lng, and radius (rayon) are provided
  let matchingIds: string[] | null = null;
  if (filters.lat !== undefined && filters.lng !== undefined && filters.rayon !== undefined) {
    const rawResults = await prisma.$queryRaw<any[]>`
      SELECT id FROM (
        SELECT id, (6371 * acos(
          cos(radians(${filters.lat})) * cos(radians(lat)) * 
          cos(radians(lng) - radians(${filters.lng})) + 
          sin(radians(${filters.lat})) * sin(radians(lat))
        )) AS distance
        FROM "Bien"
        WHERE "deletedAt" IS NULL
      ) AS sub
      WHERE distance <= ${filters.rayon}
    `;
    matchingIds = rawResults.map((row) => row.id);
  }

  // 2. Build the Prisma where filter object
  const where: any = {
    deletedAt: null, // exclude soft-deleted properties
    ...(currentUser?.role === 'LOUEUR' ? { loueurId: currentUser.id } : {}),
    ...(showOnlyReservable ? {
      statut: 'DISPONIBLE',
      annonces: {
        some: {
          statut: 'ACTIF',
        },
      },
    } : {}),
    ...(filters.ville ? { ville: { contains: filters.ville, mode: 'insensitive' } } : {}),
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.prixMin || filters.prixMax ? {
      loyer: {
        ...(filters.prixMin ? { gte: filters.prixMin } : {}),
        ...(filters.prixMax ? { lte: filters.prixMax } : {}),
      },
    } : {}),
    ...(filters.superficieMin ? { superficie: { gte: filters.superficieMin } } : {}),
    ...(filters.nbPiecesMin ? { nbPieces: { gte: filters.nbPiecesMin } } : {}),
    ...(matchingIds !== null ? { id: { in: matchingIds } } : {}),
  };

  // 3. Perform database search and count queries
  const total = await prisma.bien.count({ where });
  const biens = await prisma.bien.findMany({
    where,
    skip,
    take: limit,
    include: {
      loueur: {
        select: {
          id: true,
          nom: true,
          prenom: true,
          photo: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // 4. Resolve temporary signed URLs for property photos and owner avatar
  const formattedBiens = await Promise.all(
    biens.map(async (bien) => {
      const formatted = { ...bien, photoUrls: [] as string[], loueurPhotoUrl: null as string | null };

      // Resolve property photo URLs
      if (bien.photos && Array.isArray(bien.photos)) {
        formatted.photoUrls = await Promise.all(
          (bien.photos as any[]).map((key) => {
            return String(key).startsWith('http') ? String(key) : getSignedUrl(String(key));
          })
        );
      }

      // Resolve owner avatar photo URL
      if (bien.loueur.photo) {
        formatted.loueurPhotoUrl = bien.loueur.photo.startsWith('http')
          ? bien.loueur.photo
          : await getSignedUrl(bien.loueur.photo);
      }

      return formatted;
    })
  );

  return buildPaginatedResponse(formattedBiens, total, page, limit);
}

/**
 * Retrieves detailed property listing data, active announcements, and reviews metrics.
 * 
 * @param {string} id - The property ID.
 * @returns {Promise<BienDetailResponse>} Object containing property details, announcements, and metrics.
 * @throws {AppError} If property is not found.
 */
export async function getBienById(id: string): Promise<BienDetailResponse> {
  const bien = await prisma.bien.findUnique({
    where: { id, deletedAt: null },
    include: {
      loueur: {
        select: {
          id: true,
          nom: true,
          prenom: true,
          telephone: true,
          photo: true,
        },
      },
    },
  });

  if (!bien) {
    throw new AppError('Bien immobilier non trouvé ou supprimé.', 404);
  }

  // Resolve S3 signed URLs
  const photoUrls = bien.photos && Array.isArray(bien.photos)
    ? await Promise.all((bien.photos as any[]).map((k) => (String(k).startsWith('http') ? String(k) : getSignedUrl(String(k)))))
    : [];

  const loueurPhotoUrl = bien.loueur.photo && !bien.loueur.photo.startsWith('http')
    ? await getSignedUrl(bien.loueur.photo)
    : bien.loueur.photo;

  const resolvedBien = { ...bien, photoUrls, loueurPhotoUrl };

  // Fetch active announcements (annonces) associated with the property
  const annonces = await prisma.annonce.findMany({
    where: {
      bienId: id,
      statut: 'ACTIF',
    },
  });

  // Calculate statistics (total bookings count and average review note)
  const totalReservations = await prisma.reservation.count({
    where: { bienId: id },
  });

  const ratingStats = await prisma.avis.aggregate({
    _avg: { note: true },
    _count: { id: true },
    where: { bienId: id },
  });

  return {
    bien: resolvedBien,
    annonces,
    stats: {
      totalReservations,
      averageRating: ratingStats._avg.note ? Number(ratingStats._avg.note.toFixed(1)) : 0,
      reviewsCount: ratingStats._count.id || 0,
    },
  };
}

/**
 * Modifies an existing property listing. Verifies ownership.
 * 
 * @param {string} id - The property ID.
 * @param {string} loueurId - The ID of the client trying to modify.
 * @param {UpdateBienInput} data - The updated parameters.
 * @returns {Promise<any>} The updated property listing.
 * @throws {AppError} If user is unauthorized or property does not exist.
 */
export async function updateBien(id: string, loueurId: string, data: UpdateBienInput): Promise<any> {
  const bien = await prisma.bien.findUnique({ where: { id } });

  if (!bien) {
    throw new AppError('Bien immobilier non trouvé.', 404);
  }

  if (bien.loueurId !== loueurId) {
    throw new AppError("Vous n'avez pas les droits pour modifier ce bien.", 403);
  }

  // Re-geocode if address or city is updated
  let coords = { lat: bien.lat, lng: bien.lng };
  if (data.adresse || data.ville) {
    const newAddr = data.adresse || bien.adresse;
    const newCity = data.ville || bien.ville;
    try {
      coords = await geocodeAddress(`${newAddr}, ${newCity}`);
    } catch (err) {
      console.warn('Geocoding failed during property update:', err);
    }
  }

  return await prisma.bien.update({
    where: { id },
    data: {
      ...data,
      lat: coords.lat,
      lng: coords.lng,
    },
  });
}

/**
 * Soft-deletes a property by updating its deletedAt timestamp.
 * If there are active reservations (CONFIRMEE, EN_ATTENTE), it enforces
 * soft deletion rather than throwing an exception to preserve active contracts.
 * 
 * @param {string} id - The property ID.
 * @param {string} loueurId - The owner's ID.
 * @returns {Promise<void>}
 * @throws {AppError} If user is unauthorized or property does not exist.
 */
export async function deleteBien(id: string, loueurId: string): Promise<void> {
  const bien = await prisma.bien.findUnique({ where: { id } });

  if (!bien) {
    throw new AppError('Bien immobilier non trouvé.', 404);
  }

  if (bien.loueurId !== loueurId) {
    throw new AppError("Vous n'avez pas les droits pour supprimer ce bien.", 403);
  }

  // Set soft-delete timestamp
  await prisma.bien.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  // Soft-delete linked announcements
  await prisma.annonce.updateMany({
    where: { bienId: id },
    data: { statut: 'ARCHIVE' },
  });
}

/**
 * Uploads a list of property photos to S3 and registers their keys in the database.
 * 
 * @param {string} id - The property ID.
 * @param {string} loueurId - The owner's ID.
 * @param {Express.Multer.File[]} files - The uploaded files list.
 * @returns {Promise<any>} The updated property.
 */
export async function uploadPhotosService(
  id: string,
  loueurId: string,
  files: Express.Multer.File[]
): Promise<any> {
  const bien = await prisma.bien.findUnique({ where: { id } });

  if (!bien) {
    throw new AppError('Bien immobilier non trouvé.', 404);
  }

  if (bien.loueurId !== loueurId) {
    throw new AppError("Vous n'êtes pas autorisé à ajouter des photos à ce bien.", 403);
  }

  // Upload each file to S3 in parallel
  const uploadPromises = files.map((file) => uploadFile(file));
  const newPhotoKeys = await Promise.all(uploadPromises);

  // Append new photo keys to the existing photos list in PostgreSQL
  const existingPhotos = (bien.photos as string[]) || [];
  const updatedPhotos = [...existingPhotos, ...newPhotoKeys];

  const updatedBien = await prisma.bien.update({
    where: { id },
    data: { photos: updatedPhotos },
  });

  // Resolve signed URLs to return in API response
  const photoUrls = await Promise.all(
    updatedPhotos.map((key) => (key.startsWith('http') ? key : getSignedUrl(key)))
  );

  return { ...updatedBien, photoUrls };
}

/**
 * Modifies the availability status of a property.
 * 
 * @param {string} id - The property ID.
 * @param {string} loueurId - The owner's ID.
 * @param {string} statut - The new status (DISPONIBLE, EN_TRAVAUX, INDISPONIBLE).
 * @returns {Promise<any>} The updated property.
 */
export async function changerStatut(id: string, loueurId: string, statut: string): Promise<any> {
  const bien = await prisma.bien.findUnique({ where: { id } });

  if (!bien) {
    throw new AppError('Bien immobilier non trouvé.', 404);
  }

  if (bien.loueurId !== loueurId) {
    throw new AppError("Vous n'êtes pas autorisé à modifier le statut de ce bien.", 403);
  }

  // Validate status string
  const allowedStatuses = ['DISPONIBLE', 'EN_TRAVAUX', 'INDISPONIBLE'];
  if (!allowedStatuses.includes(statut)) {
    throw new AppError(`Statut invalide. Renseignez l'un des suivants : ${allowedStatuses.join(', ')}`, 400);
  }

  return await prisma.bien.update({
    where: { id },
    data: { statut },
  });
}

// FICHIER SUIVANT : backend/src/modules/biens/biens.controller.ts
