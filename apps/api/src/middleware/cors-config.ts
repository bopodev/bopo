import cors from "cors";
import type { DeploymentMode } from "../security/deployment-mode";

export function createCorsMiddleware(deploymentMode: DeploymentMode, allowedOrigins: string[]) {
  return cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (
        deploymentMode === "local" &&
        (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:"))
      ) {
        callback(null, true);
        return;
      }
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS origin denied: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "content-type",
      "x-company-id",
      "authorization",
      "x-client-trace-id",
      "x-bopo-actor-token",
      "x-request-id",
      "x-bopodev-run-id"
    ]
  });
}
