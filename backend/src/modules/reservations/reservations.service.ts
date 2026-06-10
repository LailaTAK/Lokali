// backend/src/modules/reservations/reservations.service.ts

import { prisma } from '../../config/database';
import { checkDisponibilite } from '../annonces/annonces.service';
import { emailQueue } from '../../config/bullmq';
import { sendEmail, sendReservationConfirmationEmail } from '../../config/mailer';
import { AppError } from '../../middlewares/error.middleware';
import { parsePagination, buildPaginatedResponse, PaginatedResponse } from '../../utils/pagination';
import { CreateReservationInput } from './reservations.schema';

/**
 * Creates a new booking reservation request in EN_ATTENTE status.
 * Automatically checks listing validity and date overlaps, calculates price,
 * creates database records, notifies the host, and schedules a J-1 BullMQ email reminder.
 * 
 * @param {string} clientId - ID of the booking CLIENT guest.
 * @param {CreateReservationInput} data - Booking arguments (dates, listing ID, message).
 * @returns {Promise<any>} The created reservation record.
 * @throws {AppError} If dates are unavailable or listing is not active.
 */
export async function createReservation(clientId: string, data: CreateReservationInput): Promise<any> {
  const { dateDebut, dateFin, message, annonceId } = data;

  // 1. Retrieve the announcement and check if it is active (ACTIF)
  const annonce = await prisma.annonce.findUnique({
    where: { id: annonceId },
    include: {
      bien: {
        include: {
          loueur: true,
        },
      },
    },
  });

  if (!annonce || annonce.statut !== 'ACTIF' || annonce.bien.deletedAt !== null) {
    throw new AppError("L'annonce n'est pas disponible pour de nouvelles réservations.", 404);
  }

  if (annonce.bien.loueurId === clientId) {
    throw new AppError("Vous ne pouvez pas réserver votre propre logement.", 400);
  }

  // 2. Verify availability (check for overlapping confirmed bookings)
  const isAvailable = await checkDisponibilite(annonceId, dateDebut, dateFin);
  if (!isAvailable) {
    throw new AppError("Le logement n'est pas disponible aux dates sélectionnées.", 400);
  }

  // 3. Compute night count and total cost
  const start = new Date(dateDebut);
  const end = new Date(dateFin);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const nbNuits = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const montantTotal = nbNuits * annonce.prixParNuit;

  // 4. Create the reservation in the database (status defaults to EN_ATTENTE)
  const reservation = await prisma.reservation.create({
    data: {
      annonceId,
      bienId: annonce.bienId,
      clientId,
      checkIn: start,
      checkOut: end,
      nbNuits,
      montantTotal,
      statut: 'EN_ATTENTE',
      message: message || null,
    },
  });

  // 5. Notify the owner via in-app alerts and email
  const host = annonce.bien.loueur;
  const client = await prisma.user.findUnique({ where: { id: clientId }, select: { nom: true, prenom: true } });
  const clientName = client ? `${client.prenom} ${client.nom}` : 'Un client';

  await prisma.alerte.create({
    data: {
      userId: host.id,
      type: 'RESERVATION',
      message: `Nouvelle demande de réservation pour "${annonce.titre}" par ${clientName}.`,
      lu: false,
    },
  });

  const emailHtml = `
    <h3>Nouvelle demande de réservation 🏠</h3>
    <p>Bonjour ${host.prenom},</p>
    <p>${clientName} souhaite réserver votre bien <strong>${annonce.bien.titre}</strong> du <strong>${start.toLocaleDateString('fr-FR')}</strong> au <strong>${end.toLocaleDateString('fr-FR')}</strong> (${nbNuits} nuits).</p>
    <p>Rendez-vous dans votre espace loueur sur l'application mobile LOKALI pour accepter ou refuser cette demande.</p>
  `;

  sendEmail(host.email, 'Demande de réservation en attente LOKALI ⏳', emailHtml).catch((err) =>
    console.error('Failed to send booking notification email to host:', err)
  );

  // 6. Schedule check-in reminder job using BullMQ J-1 (24 hours before checkIn)
  const checkInMs = start.getTime();
  const nowMs = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const triggerTimeMs = checkInMs - oneDayMs;
  const delay = triggerTimeMs - nowMs;

  if (delay > 0) {
    try {
      await emailQueue.add(
        'booking-reminder',
        {
          reservationId: reservation.id,
          to: host.email,
          subject: `Rappel : Arrivée imminente pour #${reservation.id}`,
        },
        {
          delay,
          jobId: `reminder:${reservation.id}`, // Unique ID enables deletion on cancellation
        }
      );
    } catch (bullErr) {
      console.error('Failed to queue check-in reminder job:', bullErr);
    }
  }

  return reservation;
}

/**
 * Retrieves a list of bookings filtered depending on user roles and paginated.
 * 
 * @param {string} userId - ID of the user request.
 * @param {string} role - Role of the requesting user.
 * @param {any} filters - Pagination and search filters.
 * @returns {Promise<PaginatedResponse<any>>} Paginated array of reservations.
 */
export async function getReservations(
  userId: string,
  role: string,
  filters: any
): Promise<PaginatedResponse<any>> {
  const { page, limit, skip } = parsePagination({ page: filters.page, limit: filters.limit });

  // Filter query by user role
  const where: any = {};
  if (role === 'CLIENT') {
    where.clientId = userId;
  } else if (role === 'LOUEUR') {
    where.bien = { loueurId: userId };
  } else if (role === 'ADMINISTRATEUR') {
    // Admin overrides: can filter reservations by target user IDs
    if (filters.clientId) {
      where.clientId = filters.clientId;
    }
    if (filters.loueurId) {
      where.bien = { loueurId: filters.loueurId };
    }
  }

  // Optional status filter
  if (filters.statut) {
    where.statut = filters.statut;
  }

  const total = await prisma.reservation.count({ where });
  const reservations = await prisma.reservation.findMany({
    where,
    skip,
    take: limit,
    include: {
      bien: true,
      client: {
        select: { id: true, nom: true, prenom: true, email: true },
      },
      annonce: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return buildPaginatedResponse(reservations, total, page, limit);
}

/**
 * Retrieves a reservation details by ID. Validates access rights.
 * 
 * @param {string} id - The booking ID.
 * @param {string} userId - The requesting user ID.
 * @param {string} role - The requesting user role.
 * @returns {Promise<any>} Detailed reservation record.
 * @throws {AppError} If unauthorized or booking not found.
 */
export async function getReservationById(id: string, userId: string, role: string): Promise<any> {
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      bien: {
        include: {
          loueur: { select: { id: true, nom: true, prenom: true, email: true } },
        },
      },
      client: { select: { id: true, nom: true, prenom: true, email: true } },
      paiements: true,
    },
  });

  if (!reservation) {
    throw new AppError('Réservation introuvable.', 404);
  }

  // Authorize: Client, Host, or Administrator
  const isClient = reservation.clientId === userId;
  const isHost = reservation.bien.loueurId === userId;
  const isAdmin = role === 'ADMINISTRATEUR';

  if (!isClient && !isHost && !isAdmin) {
    throw new AppError("Vous n'êtes pas autorisé à consulter cette réservation.", 403);
  }

  return reservation;
}

/**
 * Updates a reservation status (CONFIRMEE, ANNULEE).
 * Applies authorization validation rules and processes simulated refunds.
 * 
 * @param {string} id - The reservation ID.
 * @param {string} userId - Requesting user's ID.
 * @param {string} role - Requesting user's role.
 * @param {string} statut - Target status (CONFIRMEE or ANNULEE).
 * @returns {Promise<any>} The updated reservation.
 * @throws {AppError} If constraints (e.g. 48h limit) or permissions are violated.
 */
export async function updateStatut(
  id: string,
  userId: string,
  role: string,
  statut: 'CONFIRMEE' | 'ANNULEE'
): Promise<any> {
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      bien: { include: { loueur: true } },
      client: true,
      paiements: true,
    },
  });

  if (!reservation) {
    throw new AppError('Réservation introuvable.', 404);
  }

  const isClient = reservation.clientId === userId;
  const isHost = reservation.bien.loueurId === userId;
  const isAdmin = role === 'ADMINISTRATEUR';

  // 1. Authorize role action constraints
  if (role === 'CLIENT') {
    if (!isClient) throw new AppError('Non autorisé.', 403);
    if (statut !== 'ANNULEE') {
      throw new AppError('En tant que client, vous ne pouvez qu\'annuler une réservation.', 400);
    }
    // Client cancellation check: must be done at least 48 hours in advance
    const now = Date.now();
    const checkInMs = new Date(reservation.checkIn).getTime();
    const fortyEightHoursMs = 48 * 60 * 60 * 1000;
    if (checkInMs - now < fortyEightHoursMs) {
      throw new AppError("L'annulation par le client est interdite à moins de 48h de l'arrivée.", 400);
    }
  } else if (role === 'LOUEUR') {
    if (!isHost) throw new AppError('Non autorisé.', 403);
  } else if (!isAdmin) {
    throw new AppError('Non autorisé.', 403);
  }

  // 2. Perform database state updates
  const updatedReservation = await prisma.reservation.update({
    where: { id },
    data: { statut },
  });

  // 3. Post-action processing
  if (statut === 'ANNULEE') {
    // Delete BullMQ J-1 check-in reminder job if queued
    try {
      const job = await emailQueue.getJob(`reminder:${id}`);
      if (job) {
        await job.remove();
        console.log(`🗑️ Cancelled BullMQ check-in reminder for booking #${id}`);
      }
    } catch (bullErr) {
      console.warn(`Could not cancel reminder job reminder:${id}:`, bullErr);
    }

    // Process refund if a paid payment exists
    const paidPayments = reservation.paiements.filter((p: any) => p.statut === 'PAYE');
    for (const payment of paidPayments) {
      // Mark payment as refunded (REMBOURSE) in database
      await prisma.paiement.update({
        where: { id: payment.id },
        data: { statut: 'REMBOURSE' },
      });
      console.log(`💸 Refunded payment #${payment.id} for cancelled booking #${id}`);
      
      // Dispatch alert to client about refund
      await prisma.alerte.create({
        data: {
          userId: reservation.clientId,
          type: 'RESERVATION',
          message: `Remboursement initié de ${payment.amount} € suite à l'annulation de la réservation #${id}.`,
          lu: false,
        },
      });
    }
  }

  // 4. Send Alerts and Emails notifications
  const client = reservation.client;
  const host = reservation.bien.loueur;

  if (statut === 'CONFIRMEE') {
    // Notify guest
    await prisma.alerte.create({
      data: {
        userId: client.id,
        type: 'RESERVATION',
        message: `Votre réservation chez "${reservation.bien.titre}" a été confirmée !`,
        lu: false,
      },
    });

    sendReservationConfirmationEmail(client.email, {
      reservationId: id,
      bienTitle: reservation.bien.titre,
      loueurName: `${host.prenom} ${host.nom}`,
      checkIn: new Date(reservation.checkIn).toLocaleDateString('fr-FR'),
      checkOut: new Date(reservation.checkOut).toLocaleDateString('fr-FR'),
      totalAmount: reservation.montantTotal,
    }).catch((err) => console.error('Failed to send booking confirmation email to client:', err));
  } else if (statut === 'ANNULEE') {
    const cancelerName = isClient ? 'Le client' : isHost ? 'Le loueur' : 'Un administrateur';
    const notifyTargetId = isClient ? host.id : client.id;
    const notifyTargetEmail = isClient ? host.email : client.email;

    await prisma.alerte.create({
      data: {
        userId: notifyTargetId,
        type: 'RESERVATION',
        message: `${cancelerName} a annulé la réservation #${id}.`,
        lu: false,
      },
    });

    const emailHtml = `
      <h3>Réservation Annulée ❌</h3>
      <p>Bonjour,</p>
      <p>Nous vous informons que la réservation #${id} pour le logement <strong>${reservation.bien.titre}</strong> a été annulée par ${cancelerName.toLowerCase()}.</p>
      ${reservation.paiements.some((p) => p.statut === 'PAYE') ? '<p>Les fonds correspondants ont été intégralement remboursés sur le compte du client.</p>' : ''}
    `;

    sendEmail(notifyTargetEmail, `Annulation de la réservation #${id} LOKALI`, emailHtml).catch((err) =>
      console.error('Failed to send cancellation notification email:', err)
    );
  }

  return updatedReservation;
}

/**
 * Returns all confirmed bookings for properties owned by a host.
 * Ideal for rendering the host dashboard availability calendar.
 * 
 * @param {string} loueurId - The host (loueur) ID.
 * @returns {Promise<any[]>} List of confirmed reservations with guest details.
 */
export async function getCalendrierLoueur(loueurId: string): Promise<any[]> {
  return await prisma.reservation.findMany({
    where: {
      statut: 'CONFIRMEE',
      bien: {
        loueurId,
      },
    },
    include: {
      bien: {
        select: { id: true, titre: true, ville: true },
      },
      client: {
        select: { id: true, nom: true, prenom: true, email: true },
      },
    },
    orderBy: { checkIn: 'asc' },
  });
}

// FICHIER SUIVANT : backend/src/modules/reservations/reservations.controller.ts
