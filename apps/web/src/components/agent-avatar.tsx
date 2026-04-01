import { buildAgentAvatarUrl } from "@/lib/agent-avatar";
import { AGENT_LUCIDE_ICON_MAP, isAgentLucideIconName } from "@/lib/agent-lucide-icon-map";
import { cn } from "@/lib/utils";
import styles from "./agent-avatar.module.scss";

interface AgentAvatarProps {
  seed: string;
  name: string;
  className?: string;
  size?: number;
  /** When set to a curated Lucide name, shows an icon instead of the Dicebear image. */
  lucideIconName?: string | null;
}

export function AgentAvatar({ seed, name, className, size = 128, lucideIconName }: AgentAvatarProps) {
  const trimmedIcon = lucideIconName?.trim();
  if (trimmedIcon && isAgentLucideIconName(trimmedIcon)) {
    const Icon = AGENT_LUCIDE_ICON_MAP[trimmedIcon];
    return (
      <span
        className={cn(styles.glyph, className)}
        role="img"
        aria-label={`${name} avatar`}
      >
        <Icon className={styles.glyphIcon} strokeWidth={2} aria-hidden />
      </span>
    );
  }

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
