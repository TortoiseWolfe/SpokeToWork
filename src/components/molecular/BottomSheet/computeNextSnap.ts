/** Fraction of viewport height the sheet occupies at each stop. */
export const SNAP_POINTS = {
  peek: 0.12,
  half: 0.5,
  full: 0.9,
} as const;

export type SnapPoint = keyof typeof SNAP_POINTS;

/** px/ms. Above this, a release is a flick: snap one step in throw direction. */
const FLICK_THRESHOLD = 0.5;

/**
 * Given the sheet's current translateY offset at pointer release, the release
 * velocity (px/ms, positive = downward), and the viewport height, return the
 * translateY to settle at.
 *
 * translateY = 0 means the sheet's top is at the viewport top. The sheet is
 * viewportHeight tall, so translateY = vh - (snapFraction * vh) puts the
 * visible portion at snapFraction of the viewport.
 */
export function computeNextSnap(
  currentOffset: number,
  velocityY: number,
  viewportHeight: number,
): number {
  const offsets = [
    viewportHeight - SNAP_POINTS.full * viewportHeight, // smallest offset = most open
    viewportHeight - SNAP_POINTS.half * viewportHeight,
    viewportHeight - SNAP_POINTS.peek * viewportHeight, // largest offset = most closed
  ];

  // Find nearest. Ties break toward smaller offset (more open) via < .
  let nearestIdx = 0;
  let nearestDist = Math.abs(currentOffset - offsets[0]);
  for (let i = 1; i < offsets.length; i++) {
    const d = Math.abs(currentOffset - offsets[i]);
    if (d < nearestDist) {
      nearestDist = d;
      nearestIdx = i;
    }
  }

  // Flick: step one index in the throw direction, clamped.
  if (Math.abs(velocityY) >= FLICK_THRESHOLD) {
    const step = velocityY > 0 ? 1 : -1; // down = toward peek = larger idx
    const flickIdx = Math.max(0, Math.min(offsets.length - 1, nearestIdx + step));
    return offsets[flickIdx];
  }

  return offsets[nearestIdx];
}

export function snapPointToOffset(
  snap: SnapPoint,
  viewportHeight: number,
): number {
  return viewportHeight - SNAP_POINTS[snap] * viewportHeight;
}
