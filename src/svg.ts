export const COLORS = {
  green: "#4c1",
  blue: "#007ec6",
  red: "#e05d44",
  orange: "#fe7d37",
  yellow: "#dfb317",
  purple: "#9f7be1",
  pink: "#e85aad",
  gray: "#555",
  black: "#1a1a1a",
  cyan: "#24b9a7",
} as const;

export type ColorName = keyof typeof COLORS;

export interface StyleOptions {
  labelBackgroundColor?: string;
  countBackgroundColor?: string;
  textColor?: string;
  fontFamily?: string;
  fontSize?: number;
  label?: string;
  color?: ColorName | string;
}

export const DEFAULT_STYLE: Required<Omit<StyleOptions, "color">> & {
  color?: string;
} = {
  labelBackgroundColor: "#555",
  countBackgroundColor: "#4c1",
  textColor: "#fff",
  fontFamily: "Verdana,Geneva,DejaVu Sans,sans-serif",
  fontSize: 11,
  label: "Views",
};

function getColor(color: string | undefined): string {
  if (!color) return COLORS.green;
  if (color in COLORS) return COLORS[color as ColorName];
  if (color.startsWith("#")) return color;
  return COLORS.green;
}

export function generateSvg(
  count: number,
  customStyle: StyleOptions = {}
): string {
  const style = { ...DEFAULT_STYLE, ...customStyle };
  const countColor = getColor(style.color);

  const label = style.label;
  const countText = count.toLocaleString();

  // Character width estimation for Verdana at 11px
  const charWidth = style.fontSize * 0.65;
  const padding = 6;

  const labelWidth = label.length * charWidth + padding * 2;
  const countWidth = countText.length * charWidth + padding * 2;
  const totalWidth = labelWidth + countWidth;
  const height = 20;
  const radius = 3;

  // Text positioning
  const labelX = labelWidth / 2;
  const countX = labelWidth + countWidth / 2;
  const textY = height / 2 + 1;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${height}">
  <linearGradient id="smooth" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="round">
    <rect width="${totalWidth}" height="${height}" rx="${radius}" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#round)">
    <rect width="${labelWidth}" height="${height}" fill="${style.labelBackgroundColor}"/>
    <rect x="${labelWidth}" width="${countWidth}" height="${height}" fill="${countColor}"/>
    <rect width="${totalWidth}" height="${height}" fill="url(#smooth)"/>
  </g>
  <g fill="${style.textColor}" text-anchor="middle" font-family="${style.fontFamily}" font-size="${style.fontSize}">
    <text x="${labelX}" y="${textY}" dominant-baseline="middle">${label}</text>
    <text x="${countX}" y="${textY}" dominant-baseline="middle">${countText}</text>
  </g>
</svg>`;
}
