/**
 * MapLibre Color Conversion
 *
 * Extracted from BikeRoutesLayer — shared by any MapLibre layer that
 * wants to use DaisyUI semantic colors (which are oklch()) as line/fill
 * paint values.
 */

/**
 * Convert any CSS color (including oklch) to rgb() format that MapLibre
 * can parse. MapLibre's style-spec only supports hex/rgb/rgba/hsl/hsla,
 * not oklch(). Renders a 1px canvas and reads back the pixel to force
 * the browser to convert from oklch to sRGB.
 */
export function toMapLibreColor(cssColor: string): string {
  if (typeof document === 'undefined' || !cssColor) return cssColor;
  if (/^(#|rgb|hsl)/.test(cssColor)) return cssColor;
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');
  if (!ctx) return cssColor;
  ctx.fillStyle = cssColor;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  if (a < 255) return `rgba(${r},${g},${b},${(a / 255).toFixed(3)})`;
  return `rgb(${r},${g},${b})`;
}
