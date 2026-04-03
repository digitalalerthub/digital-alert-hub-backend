import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createIpRateLimiter } from "../src/middleware/rateLimitMiddleware";

describe("createIpRateLimiter", () => {
  it("bloquea con 429 cuando se supera el maximo de intentos por IP", async () => {
    const app = express();
    app.use(express.json());

    app.post(
      "/limited",
      createIpRateLimiter({
        windowMs: 60_000,
        max: 2,
        message: "Demasiados intentos",
        keyPrefix: "test-limited",
      }),
      (_req, res) => {
        res.status(200).json({ ok: true });
      }
    );

    const client = request(app);
    const ipAddress = "203.0.113.25";

    await client.post("/limited").set("X-Forwarded-For", ipAddress).send({});
    await client.post("/limited").set("X-Forwarded-For", ipAddress).send({});
    const response = await client
      .post("/limited")
      .set("X-Forwarded-For", ipAddress)
      .send({});

    expect(response.status).toBe(429);
    expect(response.body).toEqual({ message: "Demasiados intentos" });
    expect(response.headers["x-ratelimit-limit"]).toBe("2");
    expect(response.headers["x-ratelimit-remaining"]).toBe("0");
    expect(response.headers["retry-after"]).toBeTruthy();
  });

  it("en login separa el rate limit por correo dentro de la misma IP", async () => {
    const app = express();
    app.use(express.json());

    const { loginRateLimiter } = await import("../src/middleware/rateLimitMiddleware");

    app.post("/login", loginRateLimiter, (_req, res) => {
      res.status(200).json({ ok: true });
    });

    const client = request(app);
    const ipAddress = "203.0.113.25";

    for (let index = 0; index < 10; index += 1) {
      await client
        .post("/login")
        .set("X-Forwarded-For", ipAddress)
        .send({ email: "cuenta1@test.com" });
    }

    const blockedResponse = await client
      .post("/login")
      .set("X-Forwarded-For", ipAddress)
      .send({ email: "cuenta1@test.com" });

    const otherAccountResponse = await client
      .post("/login")
      .set("X-Forwarded-For", ipAddress)
      .send({ email: "cuenta2@test.com" });

    expect(blockedResponse.status).toBe(429);
    expect(otherAccountResponse.status).toBe(200);
  });
});
