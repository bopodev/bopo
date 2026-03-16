import { buildAgentAvatarUrl } from "@/lib/agent-avatar";
import { cn } from "@/lib/utils";

interface AgentAvatarProps {
  seed: string;
  name: string;
  className?: string;
  size?: number;
}

export function AgentAvatar({ seed, name, className, size = 128 }: AgentAvatarProps) {
  const avatarUrl = buildAgentAvatarUrl({ seed, size });

  return (
    <img
      src={avatarUrl}
      alt={`${name} avatar`}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className={cn(className)}
    />
  );
}
