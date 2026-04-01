import type { Application } from 'express';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import {
    isAllowedCorsOrigin,
    isApiDocsEnabled,
    resolveAllowedCorsOrigins,
} from '../src/config/securityConfig';

let app: Application;

beforeAll(async () => {
    process.env.GOOGLE_CLIENT_ID ??= 'test-google-client-id';
    process.env.GOOGLE_CLIENT_SECRET ??= 'test-google-client-secret';
    process.env.GOOGLE_CALLBACK_URL ??=
        'http://localhost:4000/api/auth/google/callback';
    process.env.FRONTEND_URL ??= 'http://localhost:5173';

    ({ default: app } = await import('../src/app'));
}, 30000);

describe('app health endpoints', () => {
    it('GET / responde que la API esta activa', async () => {
        const response = await request(app).get('/');

        expect(response.status).toBe(200);
        expect(response.text).toContain('API DigitalAlertHub activa');
    });

    it('GET /health responde ok', async () => {
        const response = await request(app).get('/health');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ status: 'ok' });
        expect(response.headers['x-content-type-options']).toBe('nosniff');
        expect(response.headers['x-frame-options']).toBe('DENY');
        expect(response.headers['content-security-policy']).toContain(
            "default-src 'none'",
        );
    });

    it('GET /api/docs/openapi.json expone el spec OpenAPI', async () => {
        const response = await request(app).get('/api/docs/openapi.json');

        expect(response.status).toBe(200);
        expect(response.body.openapi).toBe('3.0.3');
        expect(response.body.info?.title).toContain('Digital Alert Hub');
        expect(response.body.paths?.['/api/auth/login']).toBeTruthy();
    });

    it('GET /api/docs usa una CSP compatible con Swagger UI', async () => {
        const response = await request(app).get('/api/docs');

        expect(response.status).toBe(200);
        expect(response.headers['content-security-policy']).toContain(
            'https://unpkg.com',
        );
    });

    it('aplica CORS solo a origenes permitidos', async () => {
        const allowedResponse = await request(app)
            .get('/health')
            .set('Origin', 'http://localhost:5173');
        const blockedResponse = await request(app)
            .get('/health')
            .set('Origin', 'https://evil.example');

        expect(allowedResponse.headers['access-control-allow-origin']).toBe(
            'http://localhost:5173',
        );
        expect(blockedResponse.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('permite POST autenticado por cookie si el Origin esta permitido', async () => {
        const response = await request(app)
            .post('/api/auth/logout')
            .set('Origin', 'http://localhost:5173')
            .set('Cookie', 'digital_alert_hub_session=test-session');

        expect(response.status).toBe(200);
    });

    it('bloquea POST autenticado por cookie si el Origin no esta permitido', async () => {
        const response = await request(app)
            .post('/api/auth/logout')
            .set('Origin', 'https://evil.example')
            .set('Cookie', 'digital_alert_hub_session=test-session');

        expect(response.status).toBe(403);
        expect(response.body).toEqual({
            message: 'Origen no permitido para esta operacion',
        });
    });
});

describe('securityConfig', () => {
    it('resuelve una allowlist unica de origenes', () => {
        process.env.FRONTEND_URL = 'https://app.example.com/';
        process.env.FRONTEND_URLS =
            'https://admin.example.com, https://app.example.com';

        expect(resolveAllowedCorsOrigins()).toEqual([
            'https://app.example.com',
            'https://admin.example.com',
        ]);
    });

    it('habilita docs fuera de produccion y los puede forzar por variable', () => {
        const previousNodeEnv = process.env.NODE_ENV;
        const previousDocsEnabled = process.env.API_DOCS_ENABLED;

        process.env.NODE_ENV = 'production';
        delete process.env.API_DOCS_ENABLED;
        expect(isApiDocsEnabled()).toBe(false);

        process.env.API_DOCS_ENABLED = 'true';
        expect(isApiDocsEnabled()).toBe(true);

        process.env.NODE_ENV = previousNodeEnv;
        process.env.API_DOCS_ENABLED = previousDocsEnabled;
    });

    it('valida origenes permitidos y bloqueados', () => {
        const allowedOrigins = ['https://app.example.com'];

        expect(
            isAllowedCorsOrigin('https://app.example.com/', allowedOrigins),
        ).toBe(true);
        expect(
            isAllowedCorsOrigin('https://evil.example', allowedOrigins),
        ).toBe(false);
        expect(isAllowedCorsOrigin(undefined, allowedOrigins)).toBe(true);
    });
});
