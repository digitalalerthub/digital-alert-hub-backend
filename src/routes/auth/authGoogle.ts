import { Router } from 'express';
import passport from 'passport';
import '../../config/googleStrategy';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import Usuario from '../../models/User';
import { resolveFrontendBaseUrl } from '../../services/auth/authLinkService';
import { getRoleNameForToken, resolveRoleIdByCanonicalName } from '../../utils/roleUtils';

const router = Router();

router.get('/google', (req, res, next) => {
    passport.authenticate('google', {
        scope: ['profile', 'email'],
        prompt: 'consent',
        accessType: 'offline',
        state: Math.random().toString(36).substring(7),
    })(req, res, next);
});

router.get('/google/callback', passport.authenticate('google', { session: false }), async (req: any, res) => {
    try {
        const googleEmail = req.user?.emails?.[0]?.value;
        const displayName = req.user?.displayName || '';
        const frontendUrl = resolveFrontendBaseUrl() || 'http://localhost:5173';

        if (!googleEmail) {
            return res.status(400).json({ message: 'Google no devolvio email' });
        }

        let user = await Usuario.findOne({ where: { email: googleEmail } });

        if (!user) {
            const nameParts = displayName.trim().split(/\s+/).filter(Boolean);
            const nombre = nameParts[0] || 'Usuario';
            const apellido = nameParts.slice(1).join(' ') || 'Google';
            const randomPassword = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
            const hashedPassword = await bcrypt.hash(randomPassword, 10);
            const citizenRoleId = await resolveRoleIdByCanonicalName('ciudadano');

            if (!citizenRoleId) {
                return res.status(500).json({
                    message: 'El rol Ciudadano no esta configurado en la base de datos',
                });
            }

            user = await Usuario.create({
                nombre,
                apellido,
                email: googleEmail,
                contrasena: hashedPassword,
                telefono: null,
                id_rol: citizenRoleId,
                estado: true,
                email_verificado: true,
            });
        }

        if (user.bloqueo_hasta && user.bloqueo_hasta > new Date()) {
            const lockedUntil = encodeURIComponent(user.bloqueo_hasta.toISOString());
            return res.redirect(
                `${frontendUrl}/login?locked_until=${lockedUntil}`,
            );
        }

        if (!user.estado) {
            return res.redirect(
                `${frontendUrl}/login?inactive=1`,
            );
        }

        if (!user.email_verificado) {
            await user.update({ email_verificado: true });
        }

        const roleName = await getRoleNameForToken(user.id_rol);
        if (!roleName) {
            return res.status(500).json({
                message: 'El rol del usuario no esta configurado en la base de datos',
            });
        }

        const token = jwt.sign(
            {
                id: user.id_usuario,
                email: user.email,
                rol: user.id_rol,
                role_name: roleName,
            },
            process.env.JWT_SECRET!,
            { expiresIn: '8h' },
        );

        // Redirigir al callback del frontend con el token
        res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
    } catch (error) {
        console.error('Error en Google callback:', error);
        res.status(500).json({ message: 'Error autenticando con Google' });
    }
});

export default router;
