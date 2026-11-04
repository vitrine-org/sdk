// JSX element types for Vitrine widgets.
import type { PointerEventData } from "./renderer";

type Len = number | string;

/** The CSS-like style subset understood by the Vitrine renderer (camelCase keys). */
export interface Style {
  display?: "flex" | "grid" | "none";
  position?: "relative" | "absolute";
  top?: Len;
  right?: Len;
  bottom?: Len;
  left?: Len;
  inset?: Len;
  width?: Len;
  height?: Len;
  minWidth?: Len;
  minHeight?: Len;
  maxWidth?: Len;
  maxHeight?: Len;
  aspectRatio?: number;
  margin?: Len;
  marginTop?: Len;
  marginRight?: Len;
  marginBottom?: Len;
  marginLeft?: Len;
  marginHorizontal?: Len;
  marginVertical?: Len;
  padding?: Len;
  paddingTop?: Len;
  paddingRight?: Len;
  paddingBottom?: Len;
  paddingLeft?: Len;
  paddingHorizontal?: Len;
  paddingVertical?: Len;
  gap?: Len;
  rowGap?: Len;
  columnGap?: Len;
  flex?: number;
  flexDirection?: "row" | "column" | "row-reverse" | "column-reverse";
  flexWrap?: "nowrap" | "wrap" | "wrap-reverse";
  flexGrow?: number;
  flexShrink?: number;
  flexBasis?: Len;
  alignItems?: "flex-start" | "flex-end" | "center" | "baseline" | "stretch" | "start" | "end";
  alignSelf?: "flex-start" | "flex-end" | "center" | "baseline" | "stretch" | "start" | "end";
  alignContent?: string;
  justifyContent?: "flex-start" | "flex-end" | "center" | "space-between" | "space-around" | "space-evenly" | "start" | "end";
  gridTemplateColumns?: string | number;
  gridTemplateRows?: string | number;
  gridColumn?: string | number;
  gridRow?: string | number;
  overflow?: "visible" | "hidden";
  /** A color, `linear-gradient(...)` or `radial-gradient(...)`. */
  background?: string;
  backgroundColor?: string;
  border?: string;
  borderWidth?: number;
  borderColor?: string;
  borderRadius?: Len;
  borderTopLeftRadius?: number;
  borderTopRightRadius?: number;
  borderBottomRightRadius?: number;
  borderBottomLeftRadius?: number;
  boxShadow?: string;
  /**
   * Frosted glass, like CSS `backdrop-filter`: `"blur(16px) saturate(1.6)"`,
   * either function alone, or `"none"`. The desktop wallpaper behind the box is
   * blurred (radius in DIPs) and saturated, clipped to `borderRadius`, and drawn
   * under the box's own `background` (keep it translucent). Not inherited; only
   * the wallpaper shows through, not other widget content.
   */
  backdropFilter?: string;
  opacity?: number;
  /** `translate(x, y) rotate(deg) scale(s)`, applied around the box centre. */
  transform?: string;
  /** `width 0.4s ease, opacity 200ms` — numeric properties only. */
  transition?: string;
  color?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number | "normal" | "bold";
  fontStyle?: "normal" | "italic";
  letterSpacing?: Len;
  /** CSS-like `"dx dy blur color"`, inherited; a real Gaussian blur. */
  textShadow?: string;
  /** Vitrine 2.1+: `"underline"`, `"line-through"`, both, or `"none"`. Applies to nested text. */
  textDecoration?: "none" | "underline" | "line-through" | "underline line-through";
  textDecorationLine?: "none" | "underline" | "line-through" | "underline line-through";
  lineHeight?: Len;
  textAlign?: "left" | "start" | "center" | "right" | "end" | "justify";
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  whiteSpace?: "normal" | "nowrap";
  textOverflow?: "clip" | "ellipsis";
}

export interface PointerHandlers {
  onClick?: (e: PointerEventData) => void;
  onPointerDown?: (e: PointerEventData) => void;
  onPointerUp?: (e: PointerEventData) => void;
  onPointerEnter?: (e: PointerEventData) => void;
  onPointerLeave?: (e: PointerEventData) => void;
  onPointerMove?: (e: PointerEventData) => void;
  onWheel?: (e: PointerEventData) => void;
}

interface Base extends PointerHandlers {
  style?: Style | string;
  children?: any;
  ref?: any;
}

interface ShapeProps extends Base {
  fill?: string;
  fillOpacity?: number;
  stroke?: string;
  strokeOpacity?: number;
  strokeWidth?: number;
  strokeDasharray?: string | number[];
  strokeDashoffset?: number;
  strokeLinecap?: "butt" | "round" | "square";
  strokeLinejoin?: "miter" | "round" | "bevel";
  opacity?: number;
  /** SVG transform list, e.g. `rotate(150 44 44)`. */
  transform?: string;
  color?: string;
}

export interface VitrineElements {
  view: Base;
  text: Base;
  span: Base;
  br: {};
  image: Base & { src: string; objectFit?: "contain" | "cover" | "fill" };
  svg: Base & { viewBox?: string; width?: number; height?: number };
  g: ShapeProps;
  circle: ShapeProps & { cx?: number; cy?: number; r: number };
  ellipse: ShapeProps & { cx?: number; cy?: number; rx: number; ry: number };
  rect: ShapeProps & { x?: number; y?: number; width: number; height: number; rx?: number; ry?: number };
  line: ShapeProps & { x1: number; y1: number; x2: number; y2: number };
  path: ShapeProps & { d: string };
}

declare module "solid-js" {
  namespace JSX {
    interface IntrinsicElements extends VitrineElements {}
  }
}
