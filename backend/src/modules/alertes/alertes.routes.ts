// backend/src/modules/alertes/alertes.routes.ts

import { Router, Request, Response, NextFunction } from 'express';
import { getAlertes, marquerLue, marquerToutesLues, getNombreNonLues } from './alertes.service';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();

/**
 * Route: List alerts.
 * Method: GET
 * Access: Authenticated users.
 */
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await getAlertes(req.user!.id, req.query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * Route: Retrieve unread notifications count.
 * Method: GET
 * Access: Authenticated users.
 */
router.get('/non-lues', authenticate, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const count = await getNombreNonLues(req.user!.id);
    res.status(200).json({ unreadCount: count });
  } catch (error) {
    next(error);
  }
});

/**
 * Route: Mark all notifications as read.
 * Method: PATCH
 */
router.patch('/lire-tout', authenticate, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await marquerToutesLues(req.user!.id);
    res.status(200).json({ message: 'Toutes les alertes ont été marquées comme lues.' });
  } catch (error) {
    next(error);
  }
});

/**
 * Route: Mark a single notification as read.
 * Method: PATCH
 */
router.patch('/:id/lire', authenticate, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await marquerLue(req.params.id, req.user!.id);
    res.status(200).json({ message: 'Alerte marquée comme lue.' });
  } catch (error) {
    next(error);
  }
});

export const alertesRouter = router;
export default router;
