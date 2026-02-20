/**
 * IsometricCalendar - Decorative isometric calendar illustration for "Schedule Visits" feature card.
 * Uses DaisyUI semantic color classes so it adapts to all themes.
 * Purely presentational - aria-hidden by default.
 */

import type { IllustrationProps } from './IsometricDesk';

export function IsometricCalendar({
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
      {/* Calendar body - isometric box */}
      {/* Top face */}
      <polygon
        points="60,20 105,40 60,60 15,40"
        className="fill-base-100 stroke-base-content/20"
        strokeWidth="1.5"
      />
      {/* Left face */}
      <polygon
        points="15,40 60,60 60,75 15,55"
        className="fill-base-200 stroke-base-content/15"
        strokeWidth="1"
      />
      {/* Right face */}
      <polygon
        points="60,60 105,40 105,55 60,75"
        className="fill-base-300 stroke-base-content/15"
        strokeWidth="1"
      />

      {/* Calendar header bar - colored strip at top */}
      <polygon
        points="60,18 105,38 60,58 15,38"
        className="fill-primary/30"
      />
      <polygon
        points="60,14 105,34 105,38 60,58 15,38 15,34"
        className="fill-primary stroke-primary/60"
        strokeWidth="1"
      />

      {/* Calendar binding rings */}
      <ellipse cx="35" cy="27" rx="3" ry="1.5" className="stroke-base-content/40" strokeWidth="1.5" />
      <ellipse cx="50" cy="22" rx="3" ry="1.5" className="stroke-base-content/40" strokeWidth="1.5" />
      <ellipse cx="70" cy="22" rx="3" ry="1.5" className="stroke-base-content/40" strokeWidth="1.5" />
      <ellipse cx="85" cy="27" rx="3" ry="1.5" className="stroke-base-content/40" strokeWidth="1.5" />

      {/* Grid lines - horizontal (isometric) */}
      <line x1="24" y1="43" x2="96" y2="43" className="stroke-base-content/10" strokeWidth="0.5" transform="rotate(0)" />
      {/* Row lines following isometric perspective */}
      <line x1="20" y1="41" x2="82" y2="52" className="stroke-base-content/10" strokeWidth="0.5" />
      <line x1="25" y1="44" x2="87" y2="55" className="stroke-base-content/10" strokeWidth="0.5" />
      <line x1="30" y1="47" x2="92" y2="58" className="stroke-base-content/10" strokeWidth="0.5" />
      <line x1="38" y1="41" x2="56" y2="60" className="stroke-base-content/10" strokeWidth="0.5" />

      {/* Grid lines - vertical (isometric) */}
      <line x1="35" y1="37" x2="52" y2="57" className="stroke-base-content/10" strokeWidth="0.5" />
      <line x1="50" y1="36" x2="58" y2="57" className="stroke-base-content/10" strokeWidth="0.5" />
      <line x1="65" y1="36" x2="64" y2="57" className="stroke-base-content/10" strokeWidth="0.5" />
      <line x1="80" y1="37" x2="70" y2="57" className="stroke-base-content/10" strokeWidth="0.5" />

      {/* Highlighted date cell */}
      <polygon
        points="55,44 70,50 60,55 45,49"
        className="fill-accent/30 stroke-accent/50"
        strokeWidth="1"
      />
      {/* Checkmark on highlighted date */}
      <polyline
        points="52,49 56,52 63,46"
        className="stroke-accent"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Small date dots for visual texture */}
      <circle cx="28" cy="42" r="1" className="fill-base-content/20" />
      <circle cx="38" cy="39" r="1" className="fill-base-content/20" />
      <circle cx="78" cy="42" r="1" className="fill-base-content/20" />
      <circle cx="88" cy="45" r="1" className="fill-base-content/20" />
      <circle cx="32" cy="49" r="1" className="fill-base-content/15" />
      <circle cx="42" cy="46" r="1" className="fill-base-content/15" />
      <circle cx="72" cy="48" r="1" className="fill-base-content/15" />
      <circle cx="82" cy="51" r="1" className="fill-base-content/15" />

      {/* Clock element - positioned to the right */}
      <circle
        cx="95" cy="72" r="12"
        className="fill-base-100 stroke-secondary/60"
        strokeWidth="1.5"
      />
      <circle
        cx="95" cy="72" r="10"
        className="fill-base-100 stroke-secondary/30"
        strokeWidth="0.8"
      />
      {/* Clock center dot */}
      <circle cx="95" cy="72" r="1.5" className="fill-secondary" />
      {/* Hour hand */}
      <line
        x1="95" y1="72" x2="95" y2="65"
        className="stroke-secondary"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      {/* Minute hand */}
      <line
        x1="95" y1="72" x2="101" y2="69"
        className="stroke-secondary/70"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      {/* Clock tick marks */}
      <line x1="95" y1="62" x2="95" y2="64" className="stroke-base-content/30" strokeWidth="0.8" />
      <line x1="105" y1="72" x2="103" y2="72" className="stroke-base-content/30" strokeWidth="0.8" />
      <line x1="95" y1="82" x2="95" y2="80" className="stroke-base-content/30" strokeWidth="0.8" />
      <line x1="85" y1="72" x2="87" y2="72" className="stroke-base-content/30" strokeWidth="0.8" />
    </svg>
  );
}
