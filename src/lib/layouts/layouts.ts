import { Object3D, Vector3 } from 'three';

/**
 * Target positions for each arrangement. Every function is pure: given a tile count it returns
 * one Object3D per tile (position + rotation), and the scene tweens tiles towards them.
 *
 * Tiles are 120 × 160 px. Sizes are derived from the count, so the layouts still work
 * if rows are added to or removed from the sheet.
 */

export const LAYOUT_NAMES = ['table', 'sphere', 'helix', 'grid'] as const;

export type LayoutName = (typeof LAYOUT_NAMES)[number];

export type LayoutTargets = Record<LayoutName, Object3D[]>;

function assertCount(count: number): void {
  if (!Number.isInteger(count) || count < 0) {
    throw new RangeError(`Tile count must be a non-negative integer, received ${count}.`);
  }
}

/**
 * Block widths of the periodic shape. The real table has a 10-column d-block; 16 here lets 200 people
 * fit while the s- and p-blocks keep their real widths.
 */
const PERIODIC_BLOCKS = { s: 2, d: 16, p: 6 } as const;
/** Rows below the first that hold only the s- and p-blocks, leaving the notch above the d-block. */
const PERIODIC_SHORT_ROWS = 3;
/** The detached f-block: rows, width and first column. Columns 3–17 sit under the d-block (2–17). */
const PERIODIC_F_BLOCK = { rows: 2, columns: 15, firstColumn: 3 } as const;
/** Extra space between the main body and the f-block, in rows. */
const PERIODIC_F_BLOCK_GAP = 0.5;

export interface TableLayoutOptions {
  cellWidth?: number;
  cellHeight?: number;
}

/**
 * The table in the chemistry periodic table's shape, widened to hold the people instead of 118
 * elements: the first row has only its two ends (where H and He sit), the next rows only the s-block
 * (2 columns) and p-block (6 columns), then full rows, and a two-row f-block set apart below.
 * For 200 people: 2 + 3 × 8 + 6 × 24 + 2 × 15 = 200.
 *
 * Tiles fill in reading order, the main body first and the f-block last. The number of full rows
 * follows the count. Cells are a little tighter than the tile spacing elsewhere so all 12½ rows fit
 * the default view.
 */
export function createTableLayout(
  count: number,
  { cellWidth = 132, cellHeight = 172 }: TableLayoutOptions = {},
): Object3D[] {
  assertCount(count);
  const { s, d, p } = PERIODIC_BLOCKS;
  const columns = s + d + p;
  const cells: Array<{ column: number; row: number }> = [];

  cells.push({ column: 0, row: 0 }, { column: columns - 1, row: 0 });
  for (let row = 1; row <= PERIODIC_SHORT_ROWS; row++) {
    for (let column = 0; column < s; column++) cells.push({ column, row });
    for (let column = columns - p; column < columns; column++) cells.push({ column, row });
  }

  const fBlockSize = PERIODIC_F_BLOCK.rows * PERIODIC_F_BLOCK.columns;
  const fullRows = Math.max(1, Math.ceil((count - cells.length - fBlockSize) / columns));
  for (let row = PERIODIC_SHORT_ROWS + 1; row <= PERIODIC_SHORT_ROWS + fullRows; row++) {
    for (let column = 0; column < columns; column++) cells.push({ column, row });
  }

  const fBlockTop = PERIODIC_SHORT_ROWS + fullRows + 1 + PERIODIC_F_BLOCK_GAP;
  for (let row = 0; row < PERIODIC_F_BLOCK.rows; row++) {
    for (let column = 0; column < PERIODIC_F_BLOCK.columns; column++) {
      cells.push({ column: PERIODIC_F_BLOCK.firstColumn + column, row: fBlockTop + row });
    }
  }

  const lastRow = fBlockTop + PERIODIC_F_BLOCK.rows - 1;
  const offsetX = ((columns - 1) * cellWidth) / 2;
  const offsetY = (lastRow * cellHeight) / 2;

  return cells.slice(0, count).map(({ column, row }) => {
    const target = new Object3D();
    target.position.set(column * cellWidth - offsetX, -row * cellHeight + offsetY, 0);
    return target;
  });
}

export interface SphereLayoutOptions {
  radius?: number;
}

/** Same spiral distribution as the three.js demo; every tile faces outwards. */
export function createSphereLayout(count: number, { radius = 800 }: SphereLayoutOptions = {}): Object3D[] {
  assertCount(count);
  const lookTarget = new Vector3();

  return Array.from({ length: count }, (_, index) => {
    const phi = Math.acos(-1 + (2 * index) / count);
    const theta = Math.sqrt(count * Math.PI) * phi;
    const target = new Object3D();
    target.position.setFromSphericalCoords(radius, phi, theta);
    lookTarget.copy(target.position).multiplyScalar(2);
    target.lookAt(lookTarget);
    return target;
  });
}

export interface DoubleHelixLayoutOptions {
  radius?: number;
  /** Rotation between consecutive tiles on the same strand, in radians. */
  angleStep?: number;
  /** Drop between consecutive tiles on the same strand. */
  verticalStep?: number;
}

/**
 * Two strands offset by 180°, like DNA. Even indexes go to strand A, odd indexes to strand B,
 * so each pair of people sits face to face across the helix.
 *
 * Spacing check (no overlaps): neighbours on a strand are 900 × 0.175 ≈ 157 px apart (> 120 px tile
 * width), and the opposite strand reaches the same angle about 18 steps later, 180 px lower
 * (> 160 px tile height).
 */
export function createDoubleHelixLayout(
  count: number,
  { radius = 900, angleStep = 0.175, verticalStep = 10 }: DoubleHelixLayoutOptions = {},
): Object3D[] {
  assertCount(count);
  const stepsPerStrand = Math.ceil(count / 2);
  const offsetY = ((stepsPerStrand - 1) * verticalStep) / 2;
  const lookTarget = new Vector3();

  return Array.from({ length: count }, (_, index) => {
    const strand = index % 2;
    const step = Math.floor(index / 2);
    const theta = step * angleStep + Math.PI + strand * Math.PI;
    const y = -step * verticalStep + offsetY;

    const target = new Object3D();
    target.position.setFromCylindricalCoords(radius, theta, y);
    lookTarget.set(target.position.x * 2, target.position.y, target.position.z * 2);
    target.lookAt(lookTarget);
    return target;
  });
}

export interface GridLayoutOptions {
  columns?: number;
  rows?: number;
  spacingX?: number;
  spacingY?: number;
  spacingZ?: number;
}

/**
 * 3D grid: 5 columns (x) × 4 rows (y) per layer, layers stacked in depth (z).
 * 200 people fill 10 layers, giving the required 5 × 4 × 10. Layer 1 is closest to the camera.
 */
export function createGridLayout(
  count: number,
  { columns = 5, rows = 4, spacingX = 300, spacingY = 300, spacingZ = 350 }: GridLayoutOptions = {},
): Object3D[] {
  assertCount(count);
  const perLayer = columns * rows;
  const layers = Math.ceil(count / perLayer);
  const offsetX = ((columns - 1) * spacingX) / 2;
  const offsetY = ((rows - 1) * spacingY) / 2;
  const offsetZ = ((layers - 1) * spacingZ) / 2;

  return Array.from({ length: count }, (_, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns) % rows;
    const layer = Math.floor(index / perLayer);
    const target = new Object3D();
    target.position.set(
      column * spacingX - offsetX,
      -row * spacingY + offsetY,
      offsetZ - layer * spacingZ,
    );
    return target;
  });
}

export function createLayoutTargets(count: number): LayoutTargets {
  return {
    table: createTableLayout(count),
    sphere: createSphereLayout(count),
    helix: createDoubleHelixLayout(count),
    grid: createGridLayout(count),
  };
}
