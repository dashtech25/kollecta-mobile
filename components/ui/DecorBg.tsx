import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  Path,
  Pattern,
  Rect,
} from 'react-native-svg';

export type DecorVariant =
  | 'rings'      // Concentric circles bleeding off a corner — great for hero cards
  | 'dots'       // Subtle dot grid in a corner — adds texture without distracting
  | 'arc'        // Large quarter-circle accent
  | 'grid'       // Hairline grid — minimalist data feel
  | 'diagonals'; // Repeating diagonal stripes

export type DecorAnchor =
  | 'top-right'
  | 'bottom-right'
  | 'top-left'
  | 'bottom-left'
  | 'fill';

interface DecorBgProps {
  variant?: DecorVariant;
  /** Where the pattern is anchored within the parent card */
  anchor?: DecorAnchor;
  /** Stroke / fill color of the pattern */
  color?: string;
  /** Pattern opacity (0..1) */
  opacity?: number;
  /** Width of the SVG canvas (defaults to 200) */
  width?: number;
  /** Height of the SVG canvas (defaults to 200) */
  height?: number;
  style?: ViewStyle;
}

/**
 * Decorative SVG background overlay for cards.
 *
 * Renders absolutely-positioned and is `pointerEvents="none"` so it never
 * intercepts touches. Designed to be dropped into any card as a sibling of
 * the content — must be the FIRST child so content layers on top.
 *
 *   <View style={card}>
 *     <DecorBg variant="rings" anchor="bottom-right" color="#fff" opacity={0.08} />
 *     {actual content...}
 *   </View>
 */
export function DecorBg({
  variant = 'rings',
  anchor = 'bottom-right',
  color = '#FFFFFF',
  opacity = 0.08,
  width = 200,
  height = 200,
  style,
}: DecorBgProps) {
  const positionStyle = positionFor(anchor);

  return (
    <View
      pointerEvents="none"
      style={[styles.layer, positionStyle, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width={width} height={height} opacity={opacity}>
        {renderVariant(variant, color, width, height)}
      </Svg>
    </View>
  );
}

function renderVariant(v: DecorVariant, color: string, w: number, h: number) {
  switch (v) {
    case 'rings': {
      // Three concentric circles centered offscreen at bottom-right corner of the SVG.
      const cx = w;
      const cy = h;
      return (
        <G>
          <Circle cx={cx} cy={cy} r={w * 0.45} stroke={color} strokeWidth={1.5} fill="none" />
          <Circle cx={cx} cy={cy} r={w * 0.7} stroke={color} strokeWidth={1.5} fill="none" />
          <Circle cx={cx} cy={cy} r={w * 0.95} stroke={color} strokeWidth={1.5} fill="none" />
        </G>
      );
    }
    case 'dots': {
      // 6x6 dot grid — stops short of the edge to feel intentional
      const cols = 6;
      const rows = 6;
      const padX = 8;
      const padY = 8;
      const gapX = (w - padX * 2) / (cols - 1);
      const gapY = (h - padY * 2) / (rows - 1);
      const dots = [];
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          dots.push(
            <Circle
              key={`${i}-${j}`}
              cx={padX + i * gapX}
              cy={padY + j * gapY}
              r={1.2}
              fill={color}
            />,
          );
        }
      }
      return <G>{dots}</G>;
    }
    case 'arc': {
      // Big quarter-arc sweeping out of the corner
      const r = w * 0.85;
      return (
        <Path
          d={`M ${w} ${h - r} A ${r} ${r} 0 0 0 ${w - r} ${h}`}
          stroke={color}
          strokeWidth={2}
          fill="none"
        />
      );
    }
    case 'grid': {
      // Fine 12-column / 12-row hairline grid
      const cols = 12;
      const lines = [];
      for (let i = 1; i < cols; i++) {
        const x = (w / cols) * i;
        lines.push(<Line key={`v${i}`} x1={x} y1={0} x2={x} y2={h} stroke={color} strokeWidth={0.5} />);
      }
      for (let j = 1; j < cols; j++) {
        const y = (h / cols) * j;
        lines.push(<Line key={`h${j}`} x1={0} y1={y} x2={w} y2={y} stroke={color} strokeWidth={0.5} />);
      }
      return <G>{lines}</G>;
    }
    case 'diagonals': {
      // Repeating diagonal stripes via SVG <Pattern>
      return (
        <G>
          <Defs>
            <Pattern
              id="diag"
              patternUnits="userSpaceOnUse"
              width={10}
              height={10}
              patternTransform="rotate(-45)"
            >
              <Line x1={0} y1={0} x2={0} y2={10} stroke={color} strokeWidth={1.2} />
            </Pattern>
          </Defs>
          <Rect x={0} y={0} width={w} height={h} fill="url(#diag)" />
        </G>
      );
    }
    default:
      return null;
  }
}

function positionFor(anchor: DecorAnchor): ViewStyle {
  switch (anchor) {
    case 'top-right':
      return { top: 0, right: 0 };
    case 'top-left':
      return { top: 0, left: 0 };
    case 'bottom-left':
      return { bottom: 0, left: 0 };
    case 'fill':
      return { top: 0, left: 0, right: 0, bottom: 0 };
    case 'bottom-right':
    default:
      return { bottom: 0, right: 0 };
  }
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    overflow: 'hidden',
  },
});
