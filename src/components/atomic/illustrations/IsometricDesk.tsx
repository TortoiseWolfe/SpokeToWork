/**
 * IsometricDesk - Decorative isometric desk illustration for "Track Companies" feature card.
 * Uses DaisyUI semantic color classes so it adapts to all themes.
 * Purely presentational - aria-hidden by default.
 */

export interface IllustrationProps {
  className?: string;
  'aria-hidden'?: boolean;
}

export function IsometricDesk({
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
      {/* Desk surface - isometric parallelogram */}
      <polygon
        points="60,35 105,55 60,75 15,55"
        className="fill-base-200 stroke-base-content/20"
        strokeWidth="1.5"
      />
      {/* Desk front face */}
      <polygon
        points="15,55 60,75 60,82 15,62"
        className="fill-base-300 stroke-base-content/15"
        strokeWidth="1"
      />
      {/* Desk right face */}
      <polygon
        points="60,75 105,55 105,62 60,82"
        className="fill-base-300/80 stroke-base-content/15"
        strokeWidth="1"
      />

      {/* Laptop base - sitting on desk */}
      <polygon
        points="40,44 72,56 52,64 20,52"
        className="fill-primary/30 stroke-primary/60"
        strokeWidth="1"
      />
      {/* Laptop screen - angled upward */}
      <polygon
        points="40,44 72,56 72,38 40,26"
        className="fill-primary/20 stroke-primary"
        strokeWidth="1.2"
      />
      {/* Screen content lines */}
      <line
        x1="48" y1="34" x2="64" y2="40"
        className="stroke-primary/50"
        strokeWidth="1"
      />
      <line
        x1="48" y1="38" x2="60" y2="43"
        className="stroke-primary/35"
        strokeWidth="1"
      />
      <line
        x1="48" y1="42" x2="56" y2="45"
        className="stroke-primary/25"
        strokeWidth="1"
      />

      {/* Map pin */}
      <ellipse
        cx="88" cy="49" rx="4" ry="2"
        className="fill-accent/30"
      />
      <path
        d="M88,32 C84,32 81,35 81,38.5 C81,43 88,49 88,49 C88,49 95,43 95,38.5 C95,35 92,32 88,32 Z"
        className="fill-accent stroke-accent/80"
        strokeWidth="1"
      />
      <circle
        cx="88" cy="38.5" r="2.5"
        className="fill-base-100"
      />

      {/* Document stack - right side of desk */}
      <polygon
        points="75,58 92,50 85,47 68,55"
        className="fill-base-100 stroke-base-content/20"
        strokeWidth="0.8"
      />
      <polygon
        points="76,56 93,48 86,45 69,53"
        className="fill-base-100 stroke-base-content/15"
        strokeWidth="0.8"
      />
      <polygon
        points="77,54 94,46 87,43 70,51"
        className="fill-secondary/20 stroke-secondary/40"
        strokeWidth="0.8"
      />

      {/* Desk legs */}
      <line
        x1="15" y1="55" x2="15" y2="90"
        className="stroke-base-content/25"
        strokeWidth="2"
      />
      <line
        x1="60" y1="75" x2="60" y2="110"
        className="stroke-base-content/25"
        strokeWidth="2"
      />
      <line
        x1="105" y1="55" x2="105" y2="90"
        className="stroke-base-content/25"
        strokeWidth="2"
      />
    </svg>
  );
}
