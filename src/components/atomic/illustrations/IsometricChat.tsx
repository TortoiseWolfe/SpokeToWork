/**
 * IsometricChat - Decorative isometric chat illustration for "Stay Connected" feature card.
 * Uses DaisyUI semantic color classes so it adapts to all themes.
 * Purely presentational - aria-hidden by default.
 */

import type { IllustrationProps } from './IsometricDesk';

export function IsometricChat({
  className = 'h-24 w-24',
  'aria-hidden': ariaHidden = true,
}: IllustrationProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 120"
      fill="none"
      aria-hidden={ariaHidden}
    >
      {/* Phone/device body - isometric rectangle */}
      {/* Front face */}
      <rect
        x="30" y="18" width="40" height="72" rx="4"
        className="fill-base-200 stroke-base-content/25"
        strokeWidth="1.5"
        transform="skewY(-5)"
      />
      {/* Phone screen area */}
      <rect
        x="34" y="28" width="32" height="52" rx="2"
        className="fill-base-100 stroke-base-content/10"
        strokeWidth="0.8"
        transform="skewY(-5)"
      />
      {/* Phone top notch/camera */}
      <rect
        x="46" y="22" width="10" height="3" rx="1.5"
        className="fill-base-content/15"
        transform="skewY(-5)"
      />
      {/* Phone home indicator */}
      <rect
        x="44" y="78" width="14" height="2" rx="1"
        className="fill-base-content/15"
        transform="skewY(-5)"
      />

      {/* Received message bubble (left-aligned) */}
      <rect
        x="36" y="33" width="22" height="10" rx="4"
        className="fill-secondary/25 stroke-secondary/40"
        strokeWidth="0.8"
        transform="skewY(-5)"
      />
      {/* Text lines in received bubble */}
      <line x1="40" y1="37" x2="54" y2="37" className="stroke-secondary/40" strokeWidth="1.2" transform="skewY(-5)" />
      <line x1="40" y1="40" x2="50" y2="40" className="stroke-secondary/30" strokeWidth="1" transform="skewY(-5)" />

      {/* Sent message bubble (right-aligned) */}
      <rect
        x="42" y="48" width="22" height="10" rx="4"
        className="fill-primary/25 stroke-primary/40"
        strokeWidth="0.8"
        transform="skewY(-5)"
      />
      {/* Text lines in sent bubble */}
      <line x1="46" y1="52" x2="60" y2="52" className="stroke-primary/40" strokeWidth="1.2" transform="skewY(-5)" />
      <line x1="46" y1="55" x2="56" y2="55" className="stroke-primary/30" strokeWidth="1" transform="skewY(-5)" />

      {/* Received message bubble 2 */}
      <rect
        x="36" y="63" width="18" height="8" rx="4"
        className="fill-secondary/20 stroke-secondary/35"
        strokeWidth="0.8"
        transform="skewY(-5)"
      />
      {/* Text line in received bubble */}
      <line x1="40" y1="67" x2="50" y2="67" className="stroke-secondary/35" strokeWidth="1" transform="skewY(-5)" />

      {/* Floating chat bubble - sent (off-screen right) */}
      <path
        d="M78,30 L78,18 Q78,14 82,14 L108,14 Q112,14 112,18 L112,34 Q112,38 108,38 L88,38 L82,44 L82,38 L82,38 Q78,38 78,34 Z"
        className="fill-primary/15 stroke-primary/40"
        strokeWidth="1.2"
      />
      {/* Text lines in floating sent bubble */}
      <line x1="84" y1="22" x2="106" y2="22" className="stroke-primary/35" strokeWidth="1.2" />
      <line x1="84" y1="27" x2="100" y2="27" className="stroke-primary/25" strokeWidth="1" />
      <line x1="84" y1="32" x2="96" y2="32" className="stroke-primary/20" strokeWidth="1" />

      {/* Floating chat bubble - received (off-screen left) */}
      <path
        d="M5,52 L5,40 Q5,36 9,36 L32,36 Q36,36 36,40 L36,56 Q36,60 32,60 L15,60 L9,66 L9,60 Q5,60 5,56 Z"
        className="fill-secondary/15 stroke-secondary/40"
        strokeWidth="1.2"
      />
      {/* Text lines in floating received bubble */}
      <line x1="11" y1="44" x2="30" y2="44" className="stroke-secondary/35" strokeWidth="1.2" />
      <line x1="11" y1="49" x2="26" y2="49" className="stroke-secondary/25" strokeWidth="1" />
      <line x1="11" y1="54" x2="22" y2="54" className="stroke-secondary/20" strokeWidth="1" />

      {/* Notification dot */}
      <circle
        cx="72" cy="18" r="5"
        className="fill-accent stroke-accent/60"
        strokeWidth="1"
      />
      {/* Notification number */}
      <text
        x="72" y="20.5"
        textAnchor="middle"
        className="fill-base-100"
        fontSize="6"
        fontWeight="bold"
      >
        3
      </text>

      {/* Connection waves emanating from phone */}
      <path
        d="M72,55 Q78,52 80,48"
        className="stroke-accent/20"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M74,60 Q82,56 86,50"
        className="stroke-accent/15"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        d="M76,65 Q86,60 92,52"
        className="stroke-accent/10"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  );
}
