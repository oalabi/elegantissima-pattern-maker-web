/**
 * SVG Pattern Generator
 *
 * Implements the Elegantissima Autumn/Winter 1956 pattern drafting system.
 *
 * GRID CONSTRUCTION:
 * 1. Take a rectangle of paper as wide as A (chest circumference) and as tall as B (armpit to ground).
 * 2. Fold in half lengthwise twice → 4 columns. Fold in half widthwise twice → 4 rows.
 *    Repeat folding to get 32 columns × 32 rows.
 * 3. Each grid cell = A/32 cm wide × B/32 cm tall.
 *
 * AFFINE TRANSFORM (template alignment):
 * The printed pattern diagram has its own grid printed on it. We identify the bounding
 * rectangle of that printed grid in pixel coordinates (topLeftX, topLeftY) → (bottomRightX, bottomRightY).
 *
 * We then compute a scale+translate transform that maps this source rectangle to the
 * personal grid rectangle (MARGIN, MARGIN) → (MARGIN+gridW, MARGIN+gridH):
 *
 *   scaleX = gridW / (bottomRightX - topLeftX)
 *   scaleY = gridH / (bottomRightY - topLeftY)
 *   tx = MARGIN - topLeftX * scaleX
 *   ty = MARGIN - topLeftY * scaleY
 *
 * Applied as SVG matrix transform: matrix(scaleX, 0, 0, scaleY, tx, ty)
 *
 * MEASUREMENT C:
 * C (waist to hem) is marked as a horizontal dashed line at distance (B - C) from the top
 * of the grid (i.e., C cm from the bottom), since B is measured from armpit to ground.
 */

export interface SvgGeneratorOptions {
  measureA: number;
  measureB: number;
  measureC: number;
  templateUri: string | null;
  templateWidth: number;
  templateHeight: number;
  gridTopLeftX: number;
  gridTopLeftY: number;
  gridBottomRightX: number;
  gridBottomRightY: number;
  gridCols: number;
  gridRows: number;
  showGrid: boolean;
  gridColor: string;
  seamAllowance: number;
}

const PX_PER_CM = 8;
const MARGIN = 52;
const TITLE_H = 40;

export function generatePatternSvg(opts: SvgGeneratorOptions): string {
  const {
    measureA, measureB, measureC,
    templateUri, templateWidth, templateHeight,
    gridTopLeftX, gridTopLeftY, gridBottomRightX, gridBottomRightY,
    gridCols, gridRows, showGrid, gridColor, seamAllowance,
  } = opts;

  const gridW = measureA * PX_PER_CM;
  const gridH = measureB * PX_PER_CM;
  const svgW = gridW + MARGIN * 2;
  const svgH = gridH + MARGIN * 2 + TITLE_H;
  const cellW = gridW / gridCols;
  const cellH = gridH / gridRows;
  const seamPx = seamAllowance * PX_PER_CM;

  const accentColor = '#B5737A';
  const gridLineColor = gridColor || '#C9A0A0';
  const majorGridColor = '#A07878';
  const cLineColor = '#5A8C6A';
  const annotColor = '#7A3A40';

  // ── Template image with affine transform ──────────────────────────
  let imageElement = '';
  if (templateUri && templateWidth > 0 && templateHeight > 0) {
    const srcW = gridBottomRightX - gridTopLeftX;
    const srcH = gridBottomRightY - gridTopLeftY;
    if (srcW > 0 && srcH > 0) {
      const scaleX = gridW / srcW;
      const scaleY = gridH / srcH;
      const tx = MARGIN - gridTopLeftX * scaleX;
      const ty = MARGIN - gridTopLeftY * scaleY;
      imageElement = `
  <clipPath id="gridClip">
    <rect x="${MARGIN}" y="${MARGIN}" width="${gridW.toFixed(2)}" height="${gridH.toFixed(2)}"/>
  </clipPath>
  <image
    href="${templateUri}"
    x="0" y="0"
    width="${templateWidth}" height="${templateHeight}"
    transform="matrix(${scaleX.toFixed(6)},0,0,${scaleY.toFixed(6)},${tx.toFixed(4)},${ty.toFixed(4)})"
    preserveAspectRatio="none"
    opacity="0.9"
    clip-path="url(#gridClip)"
  />`;
    } else {
      imageElement = `
  <clipPath id="gridClip">
    <rect x="${MARGIN}" y="${MARGIN}" width="${gridW.toFixed(2)}" height="${gridH.toFixed(2)}"/>
  </clipPath>
  <image
    href="${templateUri}"
    x="${MARGIN}" y="${MARGIN}"
    width="${gridW.toFixed(2)}" height="${gridH.toFixed(2)}"
    preserveAspectRatio="none"
    opacity="0.9"
    clip-path="url(#gridClip)"
  />`;
    }
  }

  // ── Grid lines ─────────────────────────────────────────────────────
  let gridLines = '';
  if (showGrid) {
    for (let i = 0; i <= gridCols; i++) {
      const x = MARGIN + i * cellW;
      const isMajor = i % 8 === 0;
      const isQuarter = i % 4 === 0;
      const sw = isMajor ? 0.8 : isQuarter ? 0.5 : 0.25;
      const op = isMajor ? 0.65 : isQuarter ? 0.45 : 0.3;
      const color = isMajor ? majorGridColor : gridLineColor;
      gridLines += `<line x1="${x.toFixed(2)}" y1="${MARGIN}" x2="${x.toFixed(2)}" y2="${(MARGIN + gridH).toFixed(2)}" stroke="${color}" stroke-width="${sw}" opacity="${op}"/>`;
    }
    for (let j = 0; j <= gridRows; j++) {
      const y = MARGIN + j * cellH;
      const isMajor = j % 8 === 0;
      const isQuarter = j % 4 === 0;
      const sw = isMajor ? 0.8 : isQuarter ? 0.5 : 0.25;
      const op = isMajor ? 0.65 : isQuarter ? 0.45 : 0.3;
      const color = isMajor ? majorGridColor : gridLineColor;
      gridLines += `<line x1="${MARGIN}" y1="${y.toFixed(2)}" x2="${(MARGIN + gridW).toFixed(2)}" y2="${y.toFixed(2)}" stroke="${color}" stroke-width="${sw}" opacity="${op}"/>`;
    }
  }

  // ── Grid labels ────────────────────────────────────────────────────
  const labelFontSize = Math.max(5.5, Math.min(9, cellW * 0.55));
  let gridLabels = '';
  for (let i = 1; i <= gridCols; i++) {
    if (i % 4 === 0 || i === 1) {
      const x = MARGIN + (i - 0.5) * cellW;
      gridLabels += `<text x="${x.toFixed(2)}" y="${(MARGIN - 6).toFixed(2)}" text-anchor="middle" font-size="${labelFontSize}" fill="${majorGridColor}" opacity="0.75" font-family="'Courier New',monospace">${i}</text>`;
      gridLabels += `<text x="${x.toFixed(2)}" y="${(MARGIN + gridH + labelFontSize + 4).toFixed(2)}" text-anchor="middle" font-size="${labelFontSize}" fill="${majorGridColor}" opacity="0.75" font-family="'Courier New',monospace">${i}</text>`;
    }
  }
  for (let j = 1; j <= gridRows; j++) {
    if (j % 4 === 0 || j === 1) {
      const y = MARGIN + (j - 0.5) * cellH + labelFontSize * 0.35;
      gridLabels += `<text x="${(MARGIN - 5).toFixed(2)}" y="${y.toFixed(2)}" text-anchor="end" font-size="${labelFontSize}" fill="${majorGridColor}" opacity="0.75" font-family="'Courier New',monospace">${j}</text>`;
      gridLabels += `<text x="${(MARGIN + gridW + 5).toFixed(2)}" y="${y.toFixed(2)}" text-anchor="start" font-size="${labelFontSize}" fill="${majorGridColor}" opacity="0.75" font-family="'Courier New',monospace">${j}</text>`;
    }
  }

  // ── Seam allowance ─────────────────────────────────────────────────
  let seamRect = '';
  if (seamAllowance > 0) {
    seamRect = `
  <rect
    x="${(MARGIN - seamPx).toFixed(2)}" y="${(MARGIN - seamPx).toFixed(2)}"
    width="${(gridW + seamPx * 2).toFixed(2)}" height="${(gridH + seamPx * 2).toFixed(2)}"
    fill="none" stroke="${accentColor}" stroke-width="1" stroke-dasharray="5,3" opacity="0.55"
  />
  <text x="${(MARGIN - seamPx).toFixed(2)}" y="${(MARGIN - seamPx - 3).toFixed(2)}"
    font-size="8" fill="${accentColor}" font-family="sans-serif" opacity="0.7">
    seam allowance: ${seamAllowance} cm
  </text>`;
  }

  // ── Annotations ────────────────────────────────────────────────────
  const annotFontSize = 10;
  const arrowMargin = 20;

  const annotations = `
  <defs>
    <marker id="arr" markerWidth="6" markerHeight="4" refX="5.5" refY="2" orient="auto">
      <polygon points="0 0, 6 2, 0 4" fill="${annotColor}" opacity="0.85"/>
    </marker>
    <marker id="arr-rev" markerWidth="6" markerHeight="4" refX="0.5" refY="2" orient="auto">
      <polygon points="6 0, 0 2, 6 4" fill="${annotColor}" opacity="0.85"/>
    </marker>
  </defs>
  <line x1="${MARGIN}" y1="${(MARGIN - arrowMargin).toFixed(2)}"
    x2="${(MARGIN + gridW).toFixed(2)}" y2="${(MARGIN - arrowMargin).toFixed(2)}"
    stroke="${annotColor}" stroke-width="0.8" opacity="0.8"
    marker-start="url(#arr-rev)" marker-end="url(#arr)"/>
  <rect x="${(MARGIN + gridW / 2 - 32).toFixed(2)}" y="${(MARGIN - arrowMargin - annotFontSize - 3).toFixed(2)}"
    width="64" height="${annotFontSize + 4}" fill="#FAF7F2" opacity="0.9"/>
  <text x="${(MARGIN + gridW / 2).toFixed(2)}" y="${(MARGIN - arrowMargin - 3).toFixed(2)}"
    text-anchor="middle" font-size="${annotFontSize}" fill="${annotColor}"
    font-family="Georgia,serif" font-style="italic" font-weight="bold">A = ${measureA} cm</text>
  <line x1="${(MARGIN + gridW + arrowMargin).toFixed(2)}" y1="${MARGIN}"
    x2="${(MARGIN + gridW + arrowMargin).toFixed(2)}" y2="${(MARGIN + gridH).toFixed(2)}"
    stroke="${annotColor}" stroke-width="0.8" opacity="0.8"
    marker-start="url(#arr-rev)" marker-end="url(#arr)"/>
  <text x="${(MARGIN + gridW + arrowMargin + 4).toFixed(2)}" y="${(MARGIN + gridH / 2).toFixed(2)}"
    text-anchor="middle" font-size="${annotFontSize}" fill="${annotColor}"
    font-family="Georgia,serif" font-style="italic" font-weight="bold"
    transform="rotate(90,${(MARGIN + gridW + arrowMargin + 4).toFixed(2)},${(MARGIN + gridH / 2).toFixed(2)})">B = ${measureB} cm</text>
  ${measureC > 0 && measureC < measureB ? `
  <line x1="${MARGIN}" y1="${(MARGIN + gridH - measureC * PX_PER_CM).toFixed(2)}"
    x2="${(MARGIN + gridW).toFixed(2)}" y2="${(MARGIN + gridH - measureC * PX_PER_CM).toFixed(2)}"
    stroke="${cLineColor}" stroke-width="1" stroke-dasharray="6,3" opacity="0.75"/>
  <rect x="${(MARGIN + 2).toFixed(2)}" y="${(MARGIN + gridH - measureC * PX_PER_CM - annotFontSize - 4).toFixed(2)}"
    width="130" height="${annotFontSize + 4}" fill="#FAF7F2" opacity="0.85"/>
  <text x="${(MARGIN + 5).toFixed(2)}" y="${(MARGIN + gridH - measureC * PX_PER_CM - 4).toFixed(2)}"
    font-size="9" fill="${cLineColor}" font-family="Georgia,serif" font-style="italic" opacity="0.9">
    C = ${measureC} cm (waist to hem)</text>` : ''}`;

  // ── Grid border ────────────────────────────────────────────────────
  const gridBorder = `
  <rect x="${MARGIN}" y="${MARGIN}" width="${gridW.toFixed(2)}" height="${gridH.toFixed(2)}"
    fill="none" stroke="${majorGridColor}" stroke-width="1.2" opacity="0.85"/>`;

  // ── Title block ────────────────────────────────────────────────────
  const titleY = MARGIN + gridH + MARGIN * 0.75;
  const titleBlock = `
  <line x1="${MARGIN}" y1="${(MARGIN + gridH + 10).toFixed(2)}"
    x2="${(MARGIN + gridW).toFixed(2)}" y2="${(MARGIN + gridH + 10).toFixed(2)}"
    stroke="${majorGridColor}" stroke-width="0.5" opacity="0.5"/>
  <text x="${(svgW / 2).toFixed(2)}" y="${titleY.toFixed(2)}"
    text-anchor="middle" font-size="11" fill="${annotColor}"
    font-family="Georgia,serif" font-style="italic" opacity="0.8">
    Elegantissima Autumn/Winter 1956 — Personal Pattern Grid</text>
  <text x="${(svgW / 2).toFixed(2)}" y="${(titleY + 15).toFixed(2)}"
    text-anchor="middle" font-size="8.5" fill="${majorGridColor}"
    font-family="'Courier New',monospace" opacity="0.65">
    A=${measureA}cm · B=${measureB}cm${measureC > 0 ? ` · C=${measureC}cm` : ''} · Grid ${gridCols}×${gridRows}</text>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
  width="${svgW.toFixed(2)}" height="${svgH.toFixed(2)}"
  viewBox="0 0 ${svgW.toFixed(2)} ${svgH.toFixed(2)}">
  <rect width="${svgW.toFixed(2)}" height="${svgH.toFixed(2)}" fill="#FAF7F2"/>
  <rect x="${MARGIN}" y="${MARGIN}" width="${gridW.toFixed(2)}" height="${gridH.toFixed(2)}" fill="#FFFDF9"/>
  ${imageElement}
  ${gridLines}
  ${gridBorder}
  ${gridLabels}
  ${seamRect}
  ${annotations}
  ${titleBlock}
</svg>`;
}

export function validateMeasurements(a: string, b: string): { valid: boolean; error?: string } {
  const aNum = parseFloat(a);
  const bNum = parseFloat(b);
  if (!a || isNaN(aNum) || aNum <= 0) return { valid: false, error: 'Measurement A (chest circumference) must be a positive number.' };
  if (!b || isNaN(bNum) || bNum <= 0) return { valid: false, error: 'Measurement B (armpit to ground) must be a positive number.' };
  if (aNum > 300 || bNum > 300) return { valid: false, error: 'Measurements seem too large. Please check units (centimetres).' };
  return { valid: true };
}
