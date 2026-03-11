const DICEBEAR_OPEN_PEEPS_URL = "https://api.dicebear.com/9.x/open-peeps/svg";

interface AgentAvatarUrlOptions {
  seed: string;
  size?: number;
}

export function buildAgentAvatarUrl({ seed, size = 128 }: AgentAvatarUrlOptions) {
  const params = new URLSearchParams({
    seed,
    size: String(size),
    radius: "50",
    backgroundType: "gradientLinear",
    backgroundColor: "b6e3f4,c0aede,d1d4f9"
  });

  return `${DICEBEAR_OPEN_PEEPS_URL}?${params.toString()}`;
}

export function agentAvatarSeed(id: string, name: string, avatarSeed?: string | null) {
  const normalizedSeed = avatarSeed?.trim();
  if (normalizedSeed) {
    return normalizedSeed;
  }
  return `${id}:${name}`;
}
