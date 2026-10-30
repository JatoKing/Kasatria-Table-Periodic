import { describe, expect, it } from 'vitest';
import type { Object3D } from 'three';
import {
  createDoubleHelixLayout,
  createGridLayout,
  createLayoutTargets,
  createSphereLayout,
  createTableLayout,
  LAYOUT_NAMES,
} from './layouts';

const COUNT = 200;

function distinct(values: number[]): number {
  return new Set(values.map((value) => value.toFixed(3))).size;
}

describe('createTableLayout', () => {
  const targets = createTableLayout(COUNT);

  /** Tiles per row, top row first. */
  function rowSizes(layout: Object3D[]): number[] {
    const rows = new Map<string, number>();
    for (const { position } of layout) {
      const key = position.y.toFixed(3);
      rows.set(key, (rows.get(key) ?? 0) + 1);
    }
    return [...rows.entries()].sort(([a], [b]) => Number(b) - Number(a)).map(([, size]) => size);
  }

  it('fits 200 tiles into the periodic shape: 2, then 3 × 8, then 6 × 24, then a 2 × 15 f-block', () => {
    expect(targets).toHaveLength(COUNT);
    expect(rowSizes(targets)).toEqual([2, 8, 8, 8, 24, 24, 24, 24, 24, 24, 15, 15]);
  });

  it('gives every tile its own cell', () => {
    const cells = targets.map(({ position }) => `${position.x.toFixed(3)},${position.y.toFixed(3)}`);
    expect(new Set(cells).size).toBe(COUNT);
  });

  it('puts the first row at the two outer columns, like H and He', () => {
    const xs = targets.map(({ position }) => position.x);
    expect(targets[0].position.x).toBeCloseTo(Math.min(...xs));
    expect(targets[1].position.x).toBeCloseTo(Math.max(...xs));
  });

  it('sets the f-block apart from the main body and fills it last', () => {
    const lastMainRow = targets[169].position.y;
    const firstFBlockRow = targets[170].position.y;
    const rowStep = targets[2].position.y - targets[10].position.y;
    expect(lastMainRow - firstFBlockRow).toBeGreaterThan(rowStep);
  });

  it('is centred on the origin', () => {
    const xs = targets.map(({ position }) => position.x);
    const ys = targets.map(({ position }) => position.y);
    expect(Math.min(...xs)).toBeCloseTo(-Math.max(...xs));
    expect(Math.min(...ys)).toBeCloseTo(-Math.max(...ys));
  });

  it('adds full rows when there are more people', () => {
    const larger = createTableLayout(COUNT + 24);
    expect(rowSizes(larger)).toEqual([2, 8, 8, 8, 24, 24, 24, 24, 24, 24, 24, 15, 15]);
  });
});

describe('createSphereLayout', () => {
  it('places every tile on a sphere of radius 800', () => {
    for (const target of createSphereLayout(COUNT)) {
      expect(target.position.length()).toBeCloseTo(800);
    }
  });
});

describe('createDoubleHelixLayout', () => {
  const targets = createDoubleHelixLayout(COUNT);

  it('puts 100 tiles on each of two strands', () => {
    const strandA = targets.filter((_, index) => index % 2 === 0);
    const strandB = targets.filter((_, index) => index % 2 === 1);
    expect(strandA).toHaveLength(100);
    expect(strandB).toHaveLength(100);
  });

  it('places each pair at the same height on opposite sides of the axis', () => {
    for (let index = 0; index < COUNT; index += 2) {
      const a = targets[index].position;
      const b = targets[index + 1].position;
      expect(b.y).toBeCloseTo(a.y);
      expect(b.x).toBeCloseTo(-a.x);
      expect(b.z).toBeCloseTo(-a.z);
    }
  });

  it('keeps every tile on the cylinder radius', () => {
    for (const { position } of targets) {
      expect(Math.hypot(position.x, position.z)).toBeCloseTo(900);
    }
  });
});

describe('createGridLayout', () => {
  const targets = createGridLayout(COUNT);

  it('arranges 200 tiles as 5 × 4 × 10', () => {
    expect(distinct(targets.map((target) => target.position.x))).toBe(5);
    expect(distinct(targets.map((target) => target.position.y))).toBe(4);
    expect(distinct(targets.map((target) => target.position.z))).toBe(10);
  });

  it('gives every tile its own cell', () => {
    const cells = targets.map(({ position }) =>
      [position.x, position.y, position.z].map((value) => value.toFixed(3)).join(','),
    );
    expect(new Set(cells).size).toBe(COUNT);
  });
});

describe('createLayoutTargets', () => {
  it('builds every layout for the same number of tiles', () => {
    const targets = createLayoutTargets(7);
    for (const name of LAYOUT_NAMES) {
      expect(targets[name]).toHaveLength(7);
    }
  });

  it('rejects invalid counts', () => {
    expect(() => createTableLayout(-1)).toThrow(RangeError);
    expect(() => createGridLayout(2.5)).toThrow(RangeError);
  });
});
