// backend/src/modules/admin/admin.routes.ts

import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/role.middleware';
import { parsePagination, buildPaginatedResponse } from '../../utils/pagination';

const router = Router();

// Apply administrative middleware check to all routes in this router
router.use(authenticate, authorize('ADMINISTRATEUR'));

/**
 * Route: Get global application statistics.
 * Method: GET
 * Access: Administrators.
 */
router.get('/stats', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const clientsCount = await prisma.user.count({ where: { role: 'CLIENT' } });
    const loueursCount = await prisma.user.count({ where: { role: 'LOUEUR' } });
    const biensCount = await prisma.bien.count({ where: { deletedAt: null } });
    const reservationsCount = await prisma.reservation.count();
    
    const revenueSum = await prisma.paiement.aggregate({
      _sum: { amount: true },
      where: { statut: 'PAYE' },
    });

    res.status(200).json({
      users: {
        clients: clientsCount,
        loueurs: loueursCount,
        total: clientsCount + loueursCount,
      },
      biens: biensCount,
      reservations: reservationsCount,
      totalRevenue: revenueSum._sum.amount || 0,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Route: List all registered users in the platform.
 * Method: GET
 * Access: Administrators. Supports pagination.
 */
router.get('/utilisateurs', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit, skip } = parsePagination(req.query);

    const total = await prisma.user.count();
    const users = await prisma.user.findMany({
      skip,
      take: limit,
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        telephone: true,
        role: true,
        actif: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json(buildPaginatedResponse(users, total, page, limit));
  } catch (error) {
    next(error);
  }
});

/**
 * Route: List all registered announcements.
 * Method: GET
 * Access: Administrators only. Supports optional status filter and pagination.
 */
router.get('/annonces', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { statut } = req.query;

    const where: any = {};
    if (statut) {
      where.statut = statut;
    }

    const total = await prisma.annonce.count({ where });
    const annonces = await prisma.annonce.findMany({
      where,
      skip,
      take: limit,
      include: {
        bien: {
          include: {
            loueur: {
              select: { id: true, nom: true, prenom: true, email: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json(buildPaginatedResponse(annonces, total, page, limit));
  } catch (error) {
    next(error);
  }
});


/**
 * Route: Toggle status (block/unblock) of a user.
 * Method: PATCH
 * Access: Administrators.
 */
router.patch('/utilisateurs/:id/bloquer', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: { actif: true },
    });

    if (!user) {
      res.status(404).json({ error: 'Utilisateur introuvable.' });
      return;
    }

    // Toggle the actif boolean state
    const newActifState = !user.actif;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        actif: newActifState,
        // If blocking, revoke their refresh token to force kickout
        ...(newActifState === false ? { refreshToken: null } : {}),
      },
      select: {
        id: true,
        email: true,
        actif: true,
      },
    });

    // Invalidate Redis caches for the moderated user
    await redis.del(`user:${id}`);
    await redis.del(`user:profile:${id}`);

    res.status(200).json({
      message: `Statut de l'utilisateur mis à jour avec succès. Actif: ${updatedUser.actif}`,
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
});

export const adminRouter = router;
export default router;
