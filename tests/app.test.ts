import type { Application } from 'express';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';

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
    });

    it('GET /api/docs/openapi.json expone el spec OpenAPI', async () => {
        const response = await request(app).get('/api/docs/openapi.json');

        expect(response.status).toBe(200);
        expect(response.body.openapi).toBe('3.0.3');
        expect(response.body.info?.title).toContain('Digital Alert Hub');
        expect(response.body.paths?.['/api/auth/login']).toBeTruthy();
    });
});
