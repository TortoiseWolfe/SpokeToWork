/**
 * RouteHeroIllustration - A winding route connecting 5 map pins. Decorative hero visual.
 * All colors use DaisyUI semantic fills so it reads correctly on every theme.
 * Purely presentational - aria-hidden by default.
 */

import type { IllustrationProps } from './IsometricDesk';

interface RouteHeroIllustrationProps extends IllustrationProps {
  /** Enable subtle pulse animation on the route path. */
  animated?: boolean;
}

export function RouteHeroIllustration({
  className = '',
  'aria-hidden': ariaHidden = true,
  animated = false,
}: RouteHeroIllustrationProps) {
  // Pin coordinates — roughly left-to-right with vertical wander
  const pins = [
    { x: 15, y: 70 },
    { x: 40, y: 35 },
    { x: 65, y: 60 },
    { x: 90, y: 30 },
    { x: 115, y: 55 },
  ];

  // Build a smooth-ish path through pins using quadratic curves.
  // Each segment's control point is offset perpendicular-ish for a gentle bend.
  const path =
    `M${pins[0].x},${pins[0].y} ` +
    `Q${(pins[0].x + pins[1].x) / 2},${pins[0].y - 10} ${pins[1].x},${pins[1].y} ` +
    `Q${(pins[1].x + pins[2].x) / 2},${pins[1].y + 15} ${pins[2].x},${pins[2].y} ` +
    `Q${(pins[2].x + pins[3].x) / 2},${pins[2].y - 15} ${pins[3].x},${pins[3].y} ` +
    `Q${(pins[3].x + pins[4].x) / 2},${pins[3].y + 10} ${pins[4].x},${pins[4].y}`;

  return (
    <svg viewBox="0 0 130 90" className={className} aria-hidden={ariaHidden}>
      {/* soft ground shadow */}
      <ellipse
        cx="65"
        cy="82"
        rx="55"
        ry="6"
        className="fill-base-content/10"
      />

      {/* the route — dashed, accent-tinted */}
      <path
        d={path}
        fill="none"
        className={`stroke-accent ${animated ? 'animate-pulse' : ''}`}
        strokeWidth="2.5"
        strokeDasharray="5 4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* pins: outer ring + inner dot. Final pin gets a stronger fill (destination). */}
      <g>
        {pins.map((p, i) => {
          const isLast = i === pins.length - 1;
          return (
            <g key={i} data-testid="route-pin">
              <circle
                cx={p.x}
                cy={p.y}
                r="5"
                className={isLast ? 'fill-primary' : 'fill-primary/70'}
              />
              <circle
                cx={p.x}
                cy={p.y}
                r="2"
                className="fill-primary-content"
              />
            </g>
          );
        })}
      </g>
    </svg>
  );
}
