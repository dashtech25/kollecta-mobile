import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { NEUTRAL } from '../../constants/theme';

interface CoverageRingProps {
  /** Numerator (e.g., clients visited today) */
  value: number;
  /** Denominator (e.g., total clients in portfolio) */
  max: number;
  /** Outer ring diameter in px */
  size?: number;
  /** Stroke thickness */
  strokeWidth?: number;
  /** Optional label below the value (e.g., "clients") */
  label?: string;
  /** Color overrides */
  trackColor?: string;
  progressColor?: string;
  /** Color of the value text */
  textColor?: string;
}

/**
 * Circular progress ring using react-native-svg.
 * Used on the dashboard to visualize coverage (visited / total).
 *
 * Accessibility:
 *  - Wrapping View has accessibilityRole="progressbar" with min/max/now values
 *  - accessibilityLabel describes what the ring represents
 */
export function CoverageRing({
  value,
  max,
  size = 120,
  strokeWidth = 10,
  label,
  trackColor = NEUTRAL.surfaceSunken,
  progressColor = NEUTRAL.ink,
  textColor = NEUTRAL.ink,
}: CoverageRingProps) {
  const safeMax = Math.max(max, 1);
  const ratio = Math.min(Math.max(value / safeMax, 0), 1);
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - ratio);
  const percent = Math.round(ratio * 100);

  return (
    <View
      style={[styles.wrap, { width: size, height: size }]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Couverture clients : ${value} sur ${max}, soit ${percent}%`}
      accessibilityValue={{ min: 0, max: safeMax, now: value }}
    >
      <Svg width={size} height={size}>
        {/* Track */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress (rotated -90° so it starts at 12 o'clock) */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={progressColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>

      {/* Centered text overlay */}
      <View style={styles.center} pointerEvents="none">
        <Text style={[styles.value, { color: textColor }]}>
          {value}
          <Text style={styles.valueSep}> / </Text>
          <Text style={styles.valueMax}>{max}</Text>
        </Text>
        {label ? <Text style={styles.label}>{label}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 18,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.3,
  },
  valueSep: {
    fontWeight: '400',
    color: NEUTRAL.inkSoft,
  },
  valueMax: {
    fontWeight: '500',
    color: NEUTRAL.inkMid,
  },
  label: {
    fontSize: 10,
    color: NEUTRAL.inkSoft,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
