// Responsive widgets: the shape of the box picks the layout, the size only scales it.

/** The outline of a widget box. */
export type Shape = "square" | "wide" | "tall";

/**
 * Shape of a box from its aspect ratio: `wide` from 1.25 : 1, `tall` from 1 : 1.25, `square` in
 * between. The engine uses the same thresholds to offer one size per shape in the gallery
 * (3 × 2 and 5 × 4 cells are wide, 2 × 3 and 4 × 5 are tall, 2 × 2 to 6 × 5 square).
 */
export function shapeOf(width: number, height: number): Shape {
  if (!(width > 0) || !(height > 0)) return "square";
  const aspect = width / height;
  if (aspect >= 1.25) return "wide";
  if (aspect <= 0.8) return "tall";
  return "square";
}

/** Reference size of a design, `[width, height]` in DIPs (2 × 2 cells are 136 × 136). */
export type Reference = readonly [number, number];

/** References per shape; a missing shape falls back to `square`, then to any given one. */
export type References = Reference | Partial<Record<Shape, Reference>>;

/** The reference that applies to `shape`. */
export function referenceFor(refs: References, shape: Shape): Reference {
  if (Array.isArray(refs)) return refs as Reference;
  const map = refs as Partial<Record<Shape, Reference>>;
  return map[shape] ?? map.square ?? map.wide ?? map.tall ?? [136, 136];
}

/**
 * Scale that fits a design drawn at `ref` into `width` × `height` without cropping: multiply every
 * font size, padding, gap, stroke and radius of the design by it.
 */
export function fitScale(width: number, height: number, ref: Reference): number {
  if (!(width > 0) || !(height > 0) || !(ref[0] > 0) || !(ref[1] > 0)) return 1;
  return Math.min(width / ref[0], height / ref[1]);
}

/** A widget box seen as a responsive layout. */
export interface Responsive {
  /** Box size in DIPs. */
  width: number;
  height: number;
  shape: Shape;
  /** Scale of the shape's reference design, see {@link fitScale}. */
  scale: number;
}

/** Shape and scale of a `width` × `height` box for designs drawn at `refs`. */
export function responsive(width: number, height: number, refs: References): Responsive {
  const shape = shapeOf(width, height);
  return { width, height, shape, scale: fitScale(width, height, referenceFor(refs, shape)) };
}
