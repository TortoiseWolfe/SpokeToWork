import { describe, it, expect } from 'vitest';
import { computeNextSnap, SNAP_POINTS } from './computeNextSnap';

// offsets: translateY values. 0 = sheet fully up. Larger = further down.
// For a 1000px viewport: peek=880, half=500, full=100.
const vh = 1000;
const peek = vh - SNAP_POINTS.peek * vh; // 1000 - 120 = 880
const half = vh - SNAP_POINTS.half * vh; // 1000 - 500 = 500
const full = vh - SNAP_POINTS.full * vh; // 1000 - 900 = 100

describe('computeNextSnap', () => {
  describe('low velocity — snap to nearest', () => {
    it('snaps to peek when released near peek', () => {
      expect(computeNextSnap(870, 0.1, vh)).toBe(peek);
    });

    it('snaps to half when released near half', () => {
      expect(computeNextSnap(490, 0.1, vh)).toBe(half);
    });

    it('snaps to full when released near full', () => {
      expect(computeNextSnap(120, 0.1, vh)).toBe(full);
    });

    it('snaps to half when exactly between peek and half', () => {
      // midpoint 690 — ties break toward the smaller offset (more open)
      expect(computeNextSnap((peek + half) / 2, 0, vh)).toBe(half);
    });
  });

  describe('high velocity — flick snap in throw direction', () => {
    it('flicks down (positive vy) from half → peek', () => {
      // released at half but throwing downward hard
      expect(computeNextSnap(half, 0.8, vh)).toBe(peek);
    });

    it('flicks up (negative vy) from half → full', () => {
      expect(computeNextSnap(half, -0.8, vh)).toBe(full);
    });

    it('flick up from peek → half (one step, not full)', () => {
      expect(computeNextSnap(peek, -0.8, vh)).toBe(half);
    });

    it('flick up from full stays at full (no further)', () => {
      expect(computeNextSnap(full, -0.8, vh)).toBe(full);
    });

    it('flick down from peek stays at peek (no dismiss)', () => {
      expect(computeNextSnap(peek, 0.8, vh)).toBe(peek);
    });
  });

  describe('velocity threshold', () => {
    it('0.49 px/ms is below threshold — nearest wins', () => {
      // near half, weak downward throw — stays at half
      expect(computeNextSnap(half + 10, 0.49, vh)).toBe(half);
    });

    it('0.5 px/ms is at threshold — flick wins', () => {
      expect(computeNextSnap(half + 10, 0.5, vh)).toBe(peek);
    });
  });

  describe('clamping', () => {
    it('releases above full clamp to full', () => {
      expect(computeNextSnap(-50, 0, vh)).toBe(full);
    });

    it('releases below peek clamp to peek', () => {
      expect(computeNextSnap(vh + 50, 0, vh)).toBe(peek);
    });
  });
});
