import { ArrowUpRight, Gift } from "lucide-react";
import type { CSSProperties } from "react";

import { useAuth } from "@/hooks/use-auth";
import { useStore } from "@/lib/store";

// The referral app linked from the Refer button.
const REFERRAL_URL = "https://referral-umber.vercel.app/";

/**
 * Link to the referral app for the signed-in user, so it knows who is referring:
 * ?referrerEmail=…&referrerName=…  The name is the one given at sign-up, else the
 * user's name in Users, else the part of the email before the @.
 */
export function useReferralUrl() {
  const { user } = useAuth();
  const { users } = useStore();
  const email = user?.email ?? "";
  if (!email) return REFERRAL_URL;
  const metaName = user?.user_metadata?.["name"];
  const name =
    (typeof metaName === "string" && metaName.trim()) ||
    users.find((u) => u.email?.toLowerCase() === email.toLowerCase())?.name ||
    email.split("@")[0] ||
    "";
  const params = new URLSearchParams({ referrerEmail: email, referrerName: name });
  return `${REFERRAL_URL}?${params.toString()}`;
}

// Sparkles that twinkle around the gift on hover: position (px from the gift's centre),
// size and start delay, so they light up one after another rather than all at once.
const SPARKLES = [
  { x: -11, y: -11, size: 7, delay: 0 },
  { x: 12, y: -9, size: 5, delay: 90 },
  { x: 10, y: 11, size: 6, delay: 170 },
];

/**
 * "Refer & earn" button for the bottom of the sidebar. On hover a light sheen sweeps
 * across it, the gift gives a small hop and a few sparkles twinkle around it (about
 * 0.7s in all). With the menu minimised it shrinks to the gift icon.
 */
export function ReferButton({ expanded }: { expanded: boolean }) {
  const href = useReferralUrl();
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Refer and earn (opens the referral app in a new tab)"
      title={expanded ? undefined : "Refer & earn"}
      className={`refer-button group brand-gradient relative isolate flex h-11 items-center overflow-hidden rounded-xl text-sm font-semibold text-accent-brand-ink shadow-lg shadow-accent-brand/30 ring-1 ring-white/15 transition hover:shadow-accent-brand/50 hover:brightness-105 ${expanded ? "gap-2.5 px-3" : "justify-center px-0"}`}
    >
      <span className="relative grid size-5 shrink-0 place-items-center">
        <span aria-hidden="true" className="pointer-events-none absolute inset-0">
          {SPARKLES.map((sparkle, index) => (
            <span
              key={index}
              className="refer-sparkle"
              style={
                {
                  "--sparkle-x": `${sparkle.x}px`,
                  "--sparkle-y": `${sparkle.y}px`,
                  "--sparkle-size": `${sparkle.size}px`,
                  "--sparkle-delay": `${sparkle.delay}ms`,
                } as CSSProperties
              }
            />
          ))}
        </span>
        <Gift className="refer-gift size-5" aria-hidden="true" />
      </span>
      {expanded && (
        <>
          <span className="truncate">Refer &amp; earn</span>
          <ArrowUpRight
            size={14}
            aria-hidden="true"
            className="ml-auto opacity-70 transition duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100"
          />
        </>
      )}
    </a>
  );
}
