import type { RequestActor } from "./request-actor";

declare global {
  namespace Express {
    interface Request {
      actor?: RequestActor;
      companyId?: string;
      requestId?: string;
    }
  }
}

export {};
