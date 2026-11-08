import { describe, it, expect } from 'vitest';
import { syncLayerPaint, type PaintSyncMap } from './route-paint';

/** A fake map holding layers' paint in a plain object. */
function fakeMap(
  layers: Record<string, Record<string, unknown>>,
  opts: { throwOnSet?: boolean } = {}
): PaintSyncMap & { sets: string[] } {
  const sets: string[] = [];
  return {
    sets,
    getLayer: (id) => (layers[id] ? { id } : undefined),
    getPaintProperty: (id, name) => layers[id]?.[name],
    setPaintProperty: (id, name, value) => {
      if (opts.throwOnSet) throw new Error('Style is not done loading');
      sets.push(`${id}:${name}`);
      layers[id][name] = value;
    },
  };
}

describe('syncLayerPaint', () => {
  it('repairs a layer left thin after the active paint was lost', () => {
    const layers = { 'route-a': { 'line-width': 4, 'line-opacity': 0.25 } };
    const map = fakeMap(layers);
    const ok = syncLayerPaint(map, 'route-a', {
      'line-width': 10,
      'line-opacity': 1,
    });
    expect(ok).toBe(true);
    expect(layers['route-a']).toEqual({ 'line-width': 10, 'line-opacity': 1 });
  });

  it('changes nothing when the layer already matches', () => {
    const map = fakeMap({ 'route-a': { 'line-width': 10 } });
    expect(syncLayerPaint(map, 'route-a', { 'line-width': 10 })).toBe(true);
    expect(map.sets).toEqual([]);
  });

  it('compares array values by content', () => {
    const map = fakeMap({ 'route-a': { 'line-dasharray': [2, 1] } });
    expect(syncLayerPaint(map, 'route-a', { 'line-dasharray': [2, 1] })).toBe(
      true
    );
    expect(map.sets).toEqual([]);
  });

  it('returns false when the layer is not drawn yet', () => {
    const map = fakeMap({});
    expect(syncLayerPaint(map, 'route-a', { 'line-width': 10 })).toBe(false);
  });

  it('returns false, without throwing, when the map is not ready', () => {
    const map = fakeMap(
      { 'route-a': { 'line-width': 4 } },
      { throwOnSet: true }
    );
    expect(syncLayerPaint(map, 'route-a', { 'line-width': 10 })).toBe(false);
  });

  it('treats a missing paint as already matching', () => {
    const map = fakeMap({ 'route-a': { 'line-width': 4 } });
    expect(syncLayerPaint(map, 'route-a', undefined)).toBe(true);
  });
});
