// backend/src/modules/annonces/annonces.service.ts

import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { getSignedUrl } from '../../config/storage';
import { sendEmail } from '../../config/mailer';
import { AppError } from '../../middlewares/error.middleware';
import { parsePagination, buildPaginatedResponse, PaginatedResponse } from '../../utils/pagination';
import { CreateAnnonceInput, UpdateAnnonceInput, ModererAnnonceInput, SearchAnnonceInput } from './annonces.schema';

/**
 * Checks if a property (annonce) is available for booking during a specified date range.
 * A property is unavailable if there exists an overlapping confirmed reservation.
 * 
 * @param {string} annonceId - The ID of the announcement.
 * @param {Date} dateDebut - Requested check-in date.
 * @param {Date} dateFin - Requested check-out date.
 * @returns {Promise<boolean>} True if available (no overlap), false otherwise.
 */
export async function checkDisponibilite(
  annonceId: string,
  dateDebut: Date,
  dateFin: Date
): Promise<boolean> {
  const conflict = await prisma.reservation.findFirst({
    where: {
      annonceId,
      statut: 'CONFIRMEE',
      checkIn: { lt: dateFin },
      checkOut: { gt: dateDebut },
    },
  });
  return !conflict;
}

/**
 * Publishes a new property announcement.
 * Verifies property ownership. Newly created announcements are set to 'EN_ATTENTE'
 * (Pending validation) and system administrators are notified via alert records.
 * 
 * @param {string} loueurId - The ID of the LOUEUR requesting publication.
 * @param {CreateAnnonceInput} data - Announcement parameters.
 * @returns {Promise<any>} The created announcement.
 * @throws {AppError} If property not found or user is unauthorized.
 */
export async function createAnnonce(loueurId: string, data: CreateAnnonceInput): Promise<any> {
  const { titre, description, prixParNuit, bienId } = data;

  // 1. Fetch property and verify ownership
  const bien = await prisma.bien.findUnique({
    where: { id: bienId, deletedAt: null },
  });

  if (!bien) {
    throw new AppError('Bien immobilier associé introuvable.', 404);
  }

  if (bien.loueurId !== loueurId) {
    throw new AppError("Vous n'êtes pas autorisé à créer une annonce pour ce bien.", 403);
  }

  // 2. Insert announcement set to EN_ATTENTE
  const annonce = await prisma.annonce.create({
    data: {
      titre,
      description,
      prixParNuit,
      bienId,
      statut: 'EN_ATTENTE',
      vues: 0,
    },
  });

  // 3. Retrieve system administrators
  const admins = await prisma.user.findMany({
    where: { role: 'ADMINISTRATEUR', actif: true },
    select: { id: true },
  });

  // 4. Dispatch moderation alerts to all active administrators
  if (admins.length > 0) {
    const alertsToCreate = admins.map((admin) => ({
      userId: admin.id,
      type: 'MODERATION',
      message: `Nouvelle annonce à modérer : "${titre}" (ID: #${annonce.id})`,
      lu: false,
    }));

    await prisma.alerte.createMany({
      data: alertsToCreate,
    });
  }

  return annonce;
}

/**
 * Searches and filters approved (ACTIF) announcements with pagination support.
 * Excludes announcements with overlapping confirmed bookings if check-in/out dates are specified.
 * 
 * @param {SearchAnnonceInput} filters - The search filter values.
 * @returns {Promise<PaginatedResponse<any>>} The paginated list of matching listings.
 */
export async function getAnnonces(filters: SearchAnnonceInput): Promise<PaginatedResponse<any>> {
  const { page, limit, skip } = parsePagination({ page: filters.page, limit: filters.limit });

  // 1. Exclude announcements with conflicting bookings
  let conflictingAnnonceIds: string[] = [];
  if (filters.dateDebut && filters.dateFin) {
    const conflicts = await prisma.reservation.findMany({
      where: {
        statut: 'CONFIRMEE',
        checkIn: { lt: filters.dateFin },
        checkOut: { gt: filters.dateDebut },
      },
      select: {
        annonceId: true,
      },
    });
    conflictingAnnonceIds = conflicts.map((c) => c.annonceId);
  }

  // 2. Compose the search filter query
  const where: any = {
    statut: 'ACTIF', // only show moderated and approved announcements
    ...(conflictingAnnonceIds.length > 0 ? { id: { notIn: conflictingAnnonceIds } } : {}),
    ...(filters.prixMin || filters.prixMax ? {
      prixParNuit: {
        ...(filters.prixMin ? { gte: filters.prixMin } : {}),
        ...(filters.prixMax ? { lte: filters.prixMax } : {}),
      },
    } : {}),
    bien: {
      deletedAt: null, // exclude listings on deleted properties
      ...(filters.ville ? { ville: { contains: filters.ville, mode: 'insensitive' } } : {}),
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.nbPersonnes ? { nbPieces: { gte: filters.nbPersonnes } } : {}), // proxying room count
      ...(filters.equipements && filters.equipements.length > 0 ? {
        equipements: {
          hasEvery: filters.equipements,
        },
      } : {}),
    },
  };

  // 3. Compose sorting options
  let orderBy: any = { createdAt: 'desc' };
  if (filters.sortBy === 'prixAsc') {
    orderBy = { prixParNuit: 'asc' };
  } else if (filters.sortBy === 'prixDesc') {
    orderBy = { prixParNuit: 'desc' };
  } else if (filters.sortBy === 'dateAsc') {
    orderBy = { createdAt: 'asc' };
  } else if (filters.sortBy === 'populaire') {
    orderBy = { vues: 'desc' };
  }

  // 4. Query total count and data records
  const total = await prisma.annonce.count({ where });
  const annonces = await prisma.annonce.findMany({
    where,
    skip,
    take: limit,
    include: {
      bien: {
        include: {
          loueur: {
            select: { id: true, nom: true, prenom: true, photo: true },
          },
        },
      },
    },
    orderBy,
  });

  // 5. Resolve S3 signed URLs
  const formattedAnnonces = await Promise.all(
    annonces.map(async (annonce) => {
      const formatted = { ...annonce, photoUrls: [] as string[], loueurPhotoUrl: null as string | null };

      if (annonce.bien.photos && Array.isArray(annonce.bien.photos)) {
        formatted.photoUrls = await Promise.all(
          (annonce.bien.photos as any[]).map((key) => (String(key).startsWith('http') ? String(key) : getSignedUrl(String(key))))
        );
      }

      if (annonce.bien.loueur.photo) {
        formatted.loueurPhotoUrl = annonce.bien.loueur.photo.startsWith('http')
          ? annonce.bien.loueur.photo
          : await getSignedUrl(annonce.bien.loueur.photo);
      }

      return formatted;
    })
  );

  return buildPaginatedResponse(formattedAnnonces, total, page, limit);
}

/**
 * Retrieves an announcement by ID.
 * Increments the views count using a high-performance Redis cache,
 * and updates the Postgres database asynchronously.
 * 
 * @param {string} id - The announcement ID.
 * @returns {Promise<any>} The detailed announcement record.
 * @throws {AppError} If announcement is not found.
 */
export async function getAnnonceById(id: string): Promise<any> {
  const cacheViewsKey = `annonce:views:${id}`;

  const annonce = await prisma.annonce.findUnique({
    where: { id },
    include: {
      bien: {
        include: {
          loueur: {
            select: { id: true, nom: true, prenom: true, telephone: true, photo: true },
          },
          avis: {
            include: {
              client: {
                select: { id: true, nom: true, prenom: true, photo: true },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      },
    },
  });

  if (!annonce) {
    throw new AppError('Annonce introuvable.', 404);
  }

  // 1. High-speed page view count increment in Redis
  let views = annonce.vues;
  try {
    views = await redis.incr(cacheViewsKey);
    // Asynchronously synchronize views to the database in background
    prisma.annonce.update({
      where: { id },
      data: { vues: views },
    }).catch((err) => console.error('Failed to sync page views to DB:', err));
  } catch (redisErr) {
    console.error('Redis view counter failed:', redisErr);
  }

  // 2. Resolve S3 signed URLs
  const photoUrls = annonce.bien.photos && Array.isArray(annonce.bien.photos)
    ? await Promise.all((annonce.bien.photos as any[]).map((k) => (String(k).startsWith('http') ? String(k) : getSignedUrl(String(k)))))
    : [];

  const loueurPhotoUrl = annonce.bien.loueur.photo && !annonce.bien.loueur.photo.startsWith('http')
    ? await getSignedUrl(annonce.bien.loueur.photo)
    : annonce.bien.loueur.photo;

  // Resolve review authors photo URLs
  const formattedAvis = await Promise.all(
    annonce.bien.avis.map(async (review) => {
      const clientPhotoUrl = review.client.photo && !review.client.photo.startsWith('http')
        ? await getSignedUrl(review.client.photo)
        : review.client.photo;
      return {
        ...review,
        client: {
          ...review.client,
          clientPhotoUrl,
        },
      };
    })
  );

  return {
    ...annonce,
    vues: views,
    bien: {
      ...annonce.bien,
      photoUrls,
      loueur: {
        ...annonce.bien.loueur,
        loueurPhotoUrl,
      },
      avis: formattedAvis,
    },
  };
}

/**
 * Modifies parameters of an existing announcement. Verifies property ownership.
 * Modifying an announcement resets its status to EN_ATTENTE for moderation safety.
 * 
 * @param {string} id - The announcement ID.
 * @param {string} loueurId - The ID of the LOUEUR requesting edits.
 * @param {UpdateAnnonceInput} data - The edited properties.
 * @returns {Promise<any>} The updated announcement.
 */
export async function updateAnnonce(id: string, loueurId: string, data: UpdateAnnonceInput): Promise<any> {
  const annonce = await prisma.annonce.findUnique({
    where: { id },
    include: { bien: true },
  });

  if (!annonce) {
    throw new AppError('Annonce introuvable.', 404);
  }

  if (annonce.bien.loueurId !== loueurId) {
    throw new AppError("Vous n'êtes pas autorisé à modifier cette annonce.", 403);
  }

  // Update record, reset status to EN_ATTENTE for security moderation review
  return await prisma.annonce.update({
    where: { id },
    data: {
      ...data,
      statut: 'EN_ATTENTE',
    },
  });
}

/**
 * Archives an announcement (Soft-delete). Verifies property ownership.
 * 
 * @param {string} id - The announcement ID.
 * @param {string} loueurId - The ID of the owner.
 * @returns {Promise<void>}
 */
export async function deleteAnnonce(id: string, loueurId: string): Promise<void> {
  const annonce = await prisma.annonce.findUnique({
    where: { id },
    include: { bien: true },
  });

  if (!annonce) {
    throw new AppError('Annonce introuvable.', 404);
  }

  if (annonce.bien.loueurId !== loueurId) {
    throw new AppError("Vous n'êtes pas autorisé à supprimer cette annonce.", 403);
  }

  // Update status to ARCHIVE (hides it from standard client listings while maintaining references)
  await prisma.annonce.update({
    where: { id },
    data: { statut: 'ARCHIVE' },
  });
}

/**
 * Moderate an announcement. Sets status to ACTIF or REJETEE.
 * Dispatches an alert in DB and sends a notification email to the property owner.
 * 
 * @param {string} id - The announcement ID.
 * @param {ModererAnnonceInput} data - Moderation inputs (statut, motifRejet).
 * @returns {Promise<any>} The updated announcement.
 * @throws {AppError} If announcement does not exist.
 */
export async function modererAnnonce(id: string, data: ModererAnnonceInput): Promise<any> {
  const { statut, motifRejet } = data;

  const annonce = await prisma.annonce.findUnique({
    where: { id },
    include: {
      bien: {
        include: {
          loueur: {
            select: { id: true, nom: true, prenom: true, email: true },
          },
        },
      },
    },
  });

  if (!annonce) {
    throw new AppError('Annonce introuvable.', 404);
  }

  // 1. Update database record
  const updatedAnnonce = await prisma.annonce.update({
    where: { id },
    data: {
      statut,
      motifRejet: statut === 'REJETEE' ? motifRejet : null,
    },
  });

  // 2. Draft message strings
  const loueur = annonce.bien.loueur;
  const isApproved = statut === 'ACTIF';
  const notificationText = isApproved
    ? `Félicitations ! Votre annonce "${annonce.titre}" a été approuvée par nos modérateurs et est désormais en ligne.`
    : `Votre annonce "${annonce.titre}" a été refusée pour le motif suivant : ${motifRejet}`;

  // 3. Save notification alert in database
  await prisma.alerte.create({
    data: {
      userId: loueur.id,
      type: 'MODERATION',
      message: notificationText,
      lu: false,
    },
  });

  // 4. Send email notification
  const emailHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; background-color: #f7fafc; color: #2d3748; padding: 20px; }
          .card { max-width: 600px; margin: 0 auto; background: #ffffff; padding: 30px; border-radius: 8px; border-top: 5px solid ${isApproved ? '#38a169' : '#e53e3e'}; }
          .title { font-size: 20px; font-weight: bold; color: ${isApproved ? '#38a169' : '#e53e3e'}; }
          .footer { margin-top: 30px; font-size: 11px; color: #a0aec0; text-align: center; }
        </style>
      </head>
      <body>
        <div class="card">
          <p class="title">${isApproved ? 'Annonce validée ! 🎉' : 'Annonce rejetée ⚠️'}</p>
          <p>Bonjour ${loueur.prenom} ${loueur.nom},</p>
          <p>Le statut de modération de votre annonce pour le bien <strong>${annonce.bien.titre}</strong> a été mis à jour.</p>
          <p style="background: #f7fafc; padding: 15px; border-radius: 5px; line-height: 1.5;">${notificationText}</p>
          ${isApproved ? '<p>Votre logement est maintenant disponible aux réservations.</p>' : '<p>Vous pouvez corriger les informations de votre annonce et la soumettre de nouveau à validation.</p>'}
          <p>Cordialement,<br>L'équipe LOKALI</p>
        </div>
        <div class="footer">
          <p>&copy; LOKALI. Tous droits réservés.</p>
        </div>
      </body>
    </html>
  `;

  sendEmail(
    loueur.email,
    isApproved ? 'Validation de votre annonce LOKALI 🏠' : 'Action requise : Annonce refusée ❌',
    emailHtml
  ).catch((err) => console.error('Failed to send moderation email notification:', err));

  return updatedAnnonce;
}

// FICHIER SUIVANT : backend/src/modules/annonces/annonces.controller.ts
