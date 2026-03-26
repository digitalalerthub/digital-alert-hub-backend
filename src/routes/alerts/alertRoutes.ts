import { NextFunction, Request, Response, Router } from 'express';
import {
    createAlerta,
    deleteAlerta,
    getAlertaById,
    listFeaturedAlertas,
    listAlerta,
    updateAlerta,
} from '../../controllers/alerts/alertController';
import {
    listAlertReactions,
    toggleAlertReaction,
} from '../../controllers/alerts/alertReactionController';
import {
    createAlertComment,
    deleteAlertComment,
    listAlertComments,
    updateAlertComment,
} from '../../controllers/alerts/alertCommentController';
import { optionalVerifyToken, verifyToken } from '../../middleware/authMiddleware';
import upload from '../../middleware/uploadMiddleware';
import { updateAlertaEstado } from '../../controllers/alerts/alertStatusController';
import { asyncHandler } from '../../utils/asyncHandler';

const uploadEvidence = (req: Request, res: Response, next: NextFunction) => {
    upload.fields([
        { name: 'evidencias', maxCount: 10 },
        { name: 'evidencia', maxCount: 10 }, // compatibilidad con clientes antiguos
    ])(req, res, (err: unknown) => {
        if (err) {
            const message =
                err instanceof Error
                    ? err.message
                    : 'Archivo de evidencia invalido';
            res.status(400).json({ message });
            return;
        }

        next();
    });
};

const router = Router();

router.post('/', verifyToken, uploadEvidence, createAlerta);
router.get('/featured', listFeaturedAlertas);
router.get('/', verifyToken, listAlerta);
router.get('/:id', optionalVerifyToken, getAlertaById);
router.put('/:id', verifyToken, uploadEvidence, updateAlerta);
router.delete('/:id', verifyToken, deleteAlerta);
router.get('/:id/reactions', optionalVerifyToken, asyncHandler(listAlertReactions));
router.post('/:id/reactions', verifyToken, asyncHandler(toggleAlertReaction));
router.get('/:id/comments', asyncHandler(listAlertComments));
router.post('/:id/comments', verifyToken, asyncHandler(createAlertComment));
router.put('/:id/comments/:commentId', verifyToken, asyncHandler(updateAlertComment));
router.delete('/:id/comments/:commentId', verifyToken, asyncHandler(deleteAlertComment));
router.patch('/:id/estado', verifyToken, asyncHandler(updateAlertaEstado));

export default router;
