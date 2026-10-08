/**
 * WCAG 2.1 Relative Luminance and Contrast Ratio Utilities
 * Mathematical formulas as defined by W3C: https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */

function parseHex(hex) {
    hex = hex.replace(/^#/, '');
    if (hex.length === 3) {
        hex = hex.split('').map(c => c + c).join('');
    }
    const num = parseInt(hex, 16);
    return {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255,
        a: 1.0
    };
}

function parseRgba(rgbaStr) {
    const match = rgbaStr.match(/rgba?\s*\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/i);
    if (!match) return null;
    return {
        r: parseFloat(match[1]),
        g: parseFloat(match[2]),
        b: parseFloat(match[3]),
        a: match[4] !== undefined ? parseFloat(match[4]) : 1.0
    };
}

function parseColor(str) {
    str = (str || '').trim();
    if (str.startsWith('#')) return parseHex(str);
    if (str.startsWith('rgb')) return parseRgba(str);
    return null;
}

/**
 * Composite a foreground color with alpha over a solid background color
 */
function compositeOver(fg, bg) {
    const alpha = fg.a !== undefined ? fg.a : 1.0;
    return {
        r: Math.round(fg.r * alpha + bg.r * (1.0 - alpha)),
        g: Math.round(fg.g * alpha + bg.g * (1.0 - alpha)),
        b: Math.round(fg.b * alpha + bg.b * (1.0 - alpha)),
        a: 1.0
    };
}

/**
 * Calculate sRGB relative luminance according to WCAG 2.1
 */
function relativeLuminance(rgb) {
    const [rLinear, gLinear, bLinear] = [rgb.r, rgb.g, rgb.b].map(val => {
        const c = val / 255;
        return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Calculate contrast ratio between two colors according to WCAG 2.1
 * (L1 + 0.05) / (L2 + 0.05) where L1 is the lighter color
 */
function contrastRatio(color1, color2) {
    const l1 = relativeLuminance(color1);
    const l2 = relativeLuminance(color2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
}

module.exports = {
    parseHex,
    parseRgba,
    parseColor,
    compositeOver,
    relativeLuminance,
    contrastRatio
};
