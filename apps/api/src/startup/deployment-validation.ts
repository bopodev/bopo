import { isAuthenticatedMode, type DeploymentMode } from "../security/deployment-mode";

export function validateDeploymentConfiguration(
  deploymentMode: DeploymentMode,
  allowedOrigins: string[],
  allowedHostnames: string[],
  publicBaseUrl: URL | null
) {
  if (deploymentMode === "authenticated_public" && !publicBaseUrl) {
    throw new Error("BOPO_PUBLIC_BASE_URL is required in authenticated_public mode.");
  }
  if (isAuthenticatedMode(deploymentMode) && process.env.BOPO_AUTH_TOKEN_SECRET?.trim() === "") {
    throw new Error("BOPO_AUTH_TOKEN_SECRET must not be empty when set.");
  }
  if (isAuthenticatedMode(deploymentMode) && !process.env.BOPO_AUTH_TOKEN_SECRET?.trim()) {
    // eslint-disable-next-line no-console
    console.warn(
      "[startup] BOPO_AUTH_TOKEN_SECRET is not set. Authenticated modes will require BOPO_TRUST_ACTOR_HEADERS=1 behind a trusted proxy."
    );
  }
  if (
    isAuthenticatedMode(deploymentMode) &&
    process.env.BOPO_TRUST_ACTOR_HEADERS !== "1" &&
    !process.env.BOPO_AUTH_TOKEN_SECRET?.trim()
  ) {
    throw new Error(
      "Authenticated mode requires either BOPO_AUTH_TOKEN_SECRET (token identity) or BOPO_TRUST_ACTOR_HEADERS=1 (trusted proxy headers)."
    );
  }
  if (isAuthenticatedMode(deploymentMode) && process.env.BOPO_ALLOW_LOCAL_BOARD_FALLBACK === "1") {
    throw new Error("BOPO_ALLOW_LOCAL_BOARD_FALLBACK cannot be enabled in authenticated modes.");
  }
  // eslint-disable-next-line no-console
  console.log(
    `[startup] Deployment config: mode=${deploymentMode} origins=${allowedOrigins.join(",")} hosts=${allowedHostnames.join(",")}`
  );
}
