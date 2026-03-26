import type { RequestAuthUser } from "./auth";

declare global {
  namespace Express {
    interface User extends RequestAuthUser {}

    interface Request {
      user?: User;
    }
  }
}

export {};
