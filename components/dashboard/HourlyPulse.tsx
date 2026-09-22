import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NEUTRAL } from '../../constants/theme';
import { Transaction } from '../../types/transaction.types';

interface HourlyPulseProps {
  transactions: Transaction[] | undefined;
  /** Inclusive start hour, default 8h */
  startHour?: number;
  /** Inclusive end hour, default 18h */
  endHour?: number;
  /** Bar chart height in px */
  height?: number;
}

/**
 * Visual rhythm of today's collection activity, hour by hour.
 * Each bar represents the total deposit volume in that hour.
 * The current hour is highlighted with a darker fill.
 *
 * Accessibility:
 *  - Wrapper announces total + peak hour
 *  - Each bar has an individual a11y label (count + amount)
 */
export function HourlyPulse({
  transactions,
  startHour = 8,
  endHour = 18,
  height = 64,
}: HourlyPulseProps) {
  const { buckets, peakHour, totalAmount, totalCount } = useMemo(() => {
    const numHours = endHour - startHour + 1;
    const counts = Array.from({ length: numHours }, () => 0);
    const amounts = Array.from({ length: numHours }, () => 0);

    if (transactions) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      transactions.forEach((tx) => {
        if (tx.type !== 'DEPOSIT') return;
        const d = new Date(tx.createdAt);
        if (d < startOfDay) return;
        const h = d.getHours();
        if (h < startHour || h > endHour) return;
        const idx = h - startHour;
        counts[idx]++;
        amounts[idx] += tx.amount;
      });
    }
    const peakIdx = amounts.reduce((best, v, i) => (v > amounts[best] ? i : best), 0);
    const peak = amounts[peakIdx] > 0 ? peakIdx + startHour : null;
    return {
      buckets: amounts,
      peakHour: peak,
      totalAmount: amounts.reduce((a, b) => a + b, 0),
      totalCount: counts.reduce((a, b) => a + b, 0),
    };
  }, [transactions, startHour, endHour]);

  const max = Math.max(...buckets, 1);
  const currentHour = new Date().getHours();
  const currentIdx = currentHour - startHour;

  const a11yLabel =
    totalCount === 0
      ? 'Aucun dépôt enregistré aujourd\'hui'
      : `Activité du jour : ${totalCount} dépôts${
          peakHour !== null ? `, pic à ${peakHour}h` : ''
        }`;

  return (
    <View style={styles.wrap} accessible accessibilityLabel={a11yLabel}>
      <View style={[styles.chart, { height }]}>
        {buckets.map((value, i) => {
          const ratio = value / max;
          const barHeight = Math.max(ratio * height, 4);
          const isCurrent = i === currentIdx;
          const isInactive = value === 0 && !isCurrent;
          return (
            <View
              key={i}
              style={[
                styles.bar,
                { height: barHeight },
                isInactive && styles.barInactive,
                isCurrent && styles.barCurrent,
              ]}
              accessibilityLabel={
                value > 0
                  ? `${i + startHour} heures : ${formatShortAmount(value)}`
                  : `${i + startHour} heures : aucun dépôt`
              }
            />
          );
        })}
      </View>

      {/* Hour labels (start, middle, end) */}
      <View style={styles.labelsRow}>
        <Text style={styles.label}>{startHour}h</Text>
        <Text style={styles.label}>
          {Math.round((startHour + endHour) / 2)}h
        </Text>
        <Text style={styles.label}>{endHour}h</Text>
      </View>
    </View>
  );
}

function formatShortAmount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M FCFA';
  if (n >= 1_000) return Math.round(n / 1_000) + 'k FCFA';
  return n + ' FCFA';
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  bar: {
    flex: 1,
    backgroundColor: NEUTRAL.ink,
    borderRadius: 4,
    minHeight: 4,
  },
  barInactive: {
    backgroundColor: NEUTRAL.borderSoft,
  },
  barCurrent: {
    backgroundColor: NEUTRAL.fill,
    // subtle highlight to denote "now"
    borderTopWidth: 3,
    borderTopColor: NEUTRAL.ink,
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  label: {
    fontSize: 10,
    color: NEUTRAL.inkSoft,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontVariant: ['tabular-nums'],
  },
});
