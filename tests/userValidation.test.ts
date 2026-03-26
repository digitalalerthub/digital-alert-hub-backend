import { describe, expect, it } from 'vitest';
import {
    normalizeEmail,
    normalizePhone,
    validateEmail,
    validatePassword,
    validatePhone,
} from '../src/utils/userValidation';

describe('userValidation', () => {
    it('normaliza email y telefono', () => {
        expect(normalizeEmail('  USER@Mail.com ')).toBe('user@mail.com');
        expect(normalizePhone(' 3001234567 ')).toBe('3001234567');
    });

    it('rechaza email con formato invalido', () => {
        expect(validateEmail('correo-invalido')).toContain(
            'correo electronico',
        );
    });

    it('rechaza telefono fuera del rango permitido', () => {
        expect(validatePhone('123')).toContain('7 y 15 digitos');
    });

    it('rechaza contrasena sin letras y numeros', () => {
        expect(validatePassword('12345678')).toContain('letras y numeros');
    });
});
