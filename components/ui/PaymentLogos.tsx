import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Rect, Path, Circle } from 'react-native-svg';

/**
 * Orange Money brand mark.
 *
 * Rendered as the iconic orange square (#FF7900) with the "orange" wordmark
 * in white. We don't ship the proprietary Orange custom font — we use a
 * heavy lowercase sans-serif which reads close enough at small sizes and
 * keeps the asset entirely local (no remote image fetch).
 */
export function OrangeMoneyLogo({
  size = 36,
  style,
}: {
  size?: number;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.wrap, { width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox="0 0 36 36">
        <Rect x={0} y={0} width={36} height={36} rx={6} fill="#FF7900" />
      </Svg>
      <Text
        style={[
          styles.orangeText,
          { fontSize: size * 0.28, bottom: size * 0.16, left: size * 0.14 },
        ]}
        numberOfLines={1}
      >
        orange
      </Text>
    </View>
  );
}

/**
 * MTN MoMo brand mark.
 *
 * Yellow rounded square (#FFCC00) carrying the iconic black "MTN" wordmark
 * with the underline curve, plus a tiny "MoMo" subline. Same caveat as
 * above — close-enough sans-serif, no remote font.
 */
export function MtnMomoLogo({
  size = 36,
  style,
}: {
  size?: number;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.wrap, { width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox="0 0 36 36">
        <Rect x={0} y={0} width={36} height={36} rx={6} fill="#FFCC00" />
        {/* The MTN curve underline */}
        <Path
          d="M 8 23 Q 18 28 28 23"
          stroke="#000000"
          strokeWidth={1.5}
          fill="none"
          strokeLinecap="round"
        />
      </Svg>
      <Text
        style={[
          styles.mtnText,
          { fontSize: size * 0.32, top: size * 0.18 },
        ]}
        numberOfLines={1}
      >
        MTN
      </Text>
      <Text
        style={[
          styles.mtnSubText,
          { fontSize: size * 0.16, bottom: size * 0.08 },
        ]}
        numberOfLines={1}
      >
        MoMo
      </Text>
    </View>
  );
}

/**
 * Tiny "Cash" mark used as the visual peer of the MoMo/OM logos in the
 * method picker. Neutral palette — green stack of bills with a "FCFA" tag —
 * so the three options read as a homogeneous row.
 */
export function CashLogo({
  size = 36,
  style,
}: {
  size?: number;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.wrap, { width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox="0 0 36 36">
        <Rect x={0} y={0} width={36} height={36} rx={6} fill="#1B5E20" />
        <Rect x={6} y={11} width={24} height={14} rx={2} fill="#2E7D32" stroke="#A5D6A7" strokeWidth={0.6} />
        <Circle cx={18} cy={18} r={3.2} fill="#A5D6A7" />
      </Svg>
      <Text
        style={[
          styles.cashText,
          { fontSize: size * 0.2, bottom: size * 0.14 },
        ]}
        numberOfLines={1}
      >
        FCFA
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  orangeText: {
    position: 'absolute',
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: -0.4,
    fontVariant: ['small-caps'],
  },
  mtnText: {
    position: 'absolute',
    color: '#000000',
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  mtnSubText: {
    position: 'absolute',
    color: '#000000',
    fontWeight: '700',
    letterSpacing: 0.2,
    opacity: 0.85,
  },
  cashText: {
    position: 'absolute',
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
