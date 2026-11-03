'use strict';
// Colour maths for the contrast rules: WCAG 2.2 relative luminance and
// contrast ratio, and Power Apps ColorFade().

function hexToRgb(hex) {
  let h = String(hex).trim().replace(/^#/, '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  if (h.length === 8) h = h.slice(0, 6);
  if (!/^[0-9a-f]{6}$/i.test(h)) return null;
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
}

function rgbToHex(rgb) {
  return '#' + rgb.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase();
}

function luminance(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const [r, g, b] = rgb.map(v => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  if (la === null || lb === null) return null;
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

// Power Apps ColorFade(colour, amount): -1 is black, 0 unchanged, 1 white.
function fade(hex, amount) {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const f = Math.max(-1, Math.min(1, amount));
  return rgbToHex(rgb.map(c => (f < 0 ? c * (1 + f) : c + (255 - c) * f)));
}

module.exports = { hexToRgb, rgbToHex, luminance, contrast, fade };
