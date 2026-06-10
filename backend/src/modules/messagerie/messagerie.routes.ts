// backend/src/modules/messagerie/messagerie.routes.ts

import { Router, Request, Response, NextFunction } from 'express';
import {
  getConversations,
  getConversation,
  getNombreNonLus,
} from './messagerie.service';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();

/**
 * Route: List active conversations.
 * Method: GET
 * Access: Authenticated users.
 */
router.get('/conversations', authenticate, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const conversations = await getConversations(userId);
    res.status(200).json(conversations);
  } catch (error) {
    next(error);
  }
});

/**
 * Route: Retrieve unread incoming messages count.
 * Method: GET
 * Access: Authenticated users.
 * Note: Placed BEFORE parameterized /:userId route to prevent route collision.
 */
router.get('/non-lus', authenticate, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const unreadCount = await getNombreNonLus(userId);
    res.status(200).json({ unreadCount });
  } catch (error) {
    next(error);
  }
});

/**
 * Route: Retrieve message exchange history with a specific contact.
 * Method: GET
 * Access: Authenticated users. Supports query pagination.
 */
router.get('/:userId', authenticate, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const currentUserId = req.user!.id;
    const contactId = req.params.userId;
    const history = await getConversation(currentUserId, contactId, req.query);
    res.status(200).json(history);
  } catch (error) {
    next(error);
  }
});

export const messagerieRouter = router;
export default router;

// FICHIER SUIVANT : backend/src/test-messagerie.ts (pour vérification)
