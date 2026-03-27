"use client";
import { AnimatePresence, motion } from "framer-motion";
import type { PresenceUser } from "@/hooks/useTripPresence";

const COLORS = [
  "bg-violet-500",
  "bg-sky-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-pink-500",
  "bg-teal-500",
];

function getColor(userId: string) {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

function getInitials(user: PresenceUser) {
  if (user.name) {
    const parts = user.name.trim().split(/\s+/);
    return parts.length > 1
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0][0].toUpperCase();
  }
  return user.email[0].toUpperCase();
}

interface Props {
  viewers: PresenceUser[];
  currentUserId: string;
}

export function PresenceAvatars({ viewers, currentUserId }: Props) {
  // Show others first, then self last; cap at 4 visible
  const others = viewers.filter((v) => v.userId !== currentUserId);
  const self = viewers.find((v) => v.userId === currentUserId);
  const ordered = [...others, ...(self ? [self] : [])];
  const visible = ordered.slice(0, 4);
  const overflow = ordered.length - visible.length;

  if (ordered.length === 0) return null;

  return (
    <div className="flex items-center -space-x-2" title={ordered.map((v) => v.name ?? v.email).join(", ")}>
      <AnimatePresence initial={false}>
        {visible.map((user) => (
          <motion.div
            key={user.userId}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-2 ring-white dark:ring-gray-900 text-white text-[10px] font-semibold ${getColor(user.userId)}`}
            title={user.name ?? user.email}
          >
            {getInitials(user)}
            {user.userId !== currentUserId && (
              <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-400 ring-1 ring-white dark:ring-gray-900" />
            )}
          </motion.div>
        ))}
        {overflow > 0 && (
          <motion.div
            key="overflow"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-2 ring-white dark:ring-gray-900 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] font-semibold"
          >
            +{overflow}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
