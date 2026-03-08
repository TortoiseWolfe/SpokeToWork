/**
 * IsometricBicycle - Hero illustration for "Plan Routes" feature card.
 * The most detailed of the four illustrations.
 * Uses DaisyUI semantic color classes so it adapts to all themes.
 * Purely presentational - aria-hidden by default.
 */

import type { IllustrationProps } from './IsometricDesk';

export function IsometricBicycle({
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
      {/* Ground shadow */}
      <ellipse
        cx="60" cy="100" rx="42" ry="8"
        className="fill-base-content/5"
      />

      {/* Route path - dashed line behind bicycle */}
      <path
        d="M8,95 Q20,70 35,80 Q50,90 60,60"
        className="stroke-accent/40"
        strokeWidth="2"
        strokeDasharray="4 3"
        strokeLinecap="round"
      />
      <path
        d="M60,60 Q70,30 85,50 Q100,70 112,55"
        className="stroke-accent/40"
        strokeWidth="2"
        strokeDasharray="4 3"
        strokeLinecap="round"
      />

      {/* Route waypoint dots */}
      <circle cx="8" cy="95" r="3" className="fill-accent/60" />
      <circle cx="35" cy="80" r="2.5" className="fill-accent/50" />
      <circle cx="85" cy="50" r="2.5" className="fill-accent/50" />
      <circle cx="112" cy="55" r="3" className="fill-accent/60" />

      {/* Start waypoint ring */}
      <circle cx="8" cy="95" r="5" className="stroke-accent/30" strokeWidth="1.5" />
      {/* End waypoint ring */}
      <circle cx="112" cy="55" r="5" className="stroke-accent/30" strokeWidth="1.5" />

      {/* Rear wheel */}
      <circle
        cx="38" cy="78" r="16"
        className="stroke-primary" strokeWidth="2"
      />
      <circle
        cx="38" cy="78" r="13"
        className="stroke-primary/20" strokeWidth="1"
      />
      {/* Rear wheel spokes */}
      <line x1="38" y1="62" x2="38" y2="94" className="stroke-primary/30" strokeWidth="0.8" />
      <line x1="22" y1="78" x2="54" y2="78" className="stroke-primary/30" strokeWidth="0.8" />
      <line x1="26.7" y1="66.7" x2="49.3" y2="89.3" className="stroke-primary/25" strokeWidth="0.7" />
      <line x1="49.3" y1="66.7" x2="26.7" y2="89.3" className="stroke-primary/25" strokeWidth="0.7" />
      {/* Rear hub */}
      <circle cx="38" cy="78" r="2.5" className="fill-primary/40 stroke-primary/60" strokeWidth="1" />

      {/* Front wheel */}
      <circle
        cx="82" cy="78" r="16"
        className="stroke-secondary" strokeWidth="2"
      />
      <circle
        cx="82" cy="78" r="13"
        className="stroke-secondary/20" strokeWidth="1"
      />
      {/* Front wheel spokes */}
      <line x1="82" y1="62" x2="82" y2="94" className="stroke-secondary/30" strokeWidth="0.8" />
      <line x1="66" y1="78" x2="98" y2="78" className="stroke-secondary/30" strokeWidth="0.8" />
      <line x1="70.7" y1="66.7" x2="93.3" y2="89.3" className="stroke-secondary/25" strokeWidth="0.7" />
      <line x1="93.3" y1="66.7" x2="70.7" y2="89.3" className="stroke-secondary/25" strokeWidth="0.7" />
      {/* Front hub */}
      <circle cx="82" cy="78" r="2.5" className="fill-secondary/40 stroke-secondary/60" strokeWidth="1" />

      {/* Frame - main triangle */}
      {/* Down tube: bottom bracket to head tube */}
      <line x1="55" y1="80" x2="76" y2="65" className="stroke-primary" strokeWidth="2.5" strokeLinecap="round" />
      {/* Seat tube: bottom bracket to seat */}
      <line x1="55" y1="80" x2="50" y2="52" className="stroke-primary" strokeWidth="2.5" strokeLinecap="round" />
      {/* Top tube: seat to head tube */}
      <line x1="50" y1="52" x2="76" y2="55" className="stroke-primary" strokeWidth="2" strokeLinecap="round" />

      {/* Chain stay: bottom bracket to rear axle */}
      <line x1="55" y1="80" x2="38" y2="78" className="stroke-primary/70" strokeWidth="1.8" strokeLinecap="round" />
      {/* Seat stay: seat to rear axle */}
      <line x1="50" y1="52" x2="38" y2="78" className="stroke-primary/60" strokeWidth="1.5" strokeLinecap="round" />

      {/* Fork: head tube to front axle */}
      <line x1="76" y1="60" x2="82" y2="78" className="stroke-secondary" strokeWidth="2.2" strokeLinecap="round" />

      {/* Handlebar */}
      <path
        d="M72,50 Q76,48 80,52"
        className="stroke-base-content/70"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Handlebar grips */}
      <circle cx="72" cy="50" r="1.5" className="fill-base-content/50" />
      <circle cx="80" cy="52" r="1.5" className="fill-base-content/50" />

      {/* Seat */}
      <ellipse
        cx="49" cy="50" rx="5" ry="2.5"
        className="fill-base-content/40 stroke-base-content/50"
        strokeWidth="1"
        transform="rotate(-5, 49, 50)"
      />

      {/* Pedal crank */}
      <circle cx="55" cy="80" r="3" className="fill-primary/30 stroke-primary/50" strokeWidth="1" />
      {/* Pedals */}
      <line x1="52" y1="76" x2="58" y2="84" className="stroke-base-content/40" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="50" y="74" width="4" height="2" rx="0.5" className="fill-base-content/35" transform="rotate(-30, 52, 75)" />
      <rect x="56" y="83" width="4" height="2" rx="0.5" className="fill-base-content/35" transform="rotate(-30, 58, 84)" />

      {/* Chain */}
      <path
        d="M55,83 Q46,88 38,81"
        className="stroke-base-content/20"
        strokeWidth="1"
        fill="none"
      />
    </svg>
  );
}
