import { Router } from 'express';
import passport from 'passport';
import '../config/googleStrategy';
import jwt from 'jsonwebtoken';
import Usuario from '../models/User';

const router = Router();

router.get('/google', (req, res, next) => {
    passport.authenticate('google', {
        scope: ['profile', 'email'],
        prompt: 'consent',
        accessType: 'offline',
        state: Math.random().toString(36).substring(7),
    })(req, res, next);
});

router.get(
    '/google/callback',
    passport.authenticate('google', { session: false }),
    async (req: any, res) => {
        try {
            // req.user ya es el objeto Usuario de Sequelize (lo retorna la estrategia)
            const user = req.user as Usuario;

            const token = jwt.sign(
                {
                    id: user.id_usuario,
                    email: user.email,
                    rol: user.id_rol,
                },
                process.env.JWT_SECRET!,
                { expiresIn: '8h' },
            );

            res.redirect(
                `${process.env.FRONTEND_URL}/auth/callback?token=${token}`,
            );
        } catch (error) {
            console.error('Error en Google callback:', error);
            res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
        }
    },
);

export default router;
