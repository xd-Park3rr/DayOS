import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { MomentumSummary } from '../types';
import { COLORS } from '../constants';

const getMomentumColor = (score: number): string => {
  if (score > 70) {
    return COLORS.red;
  }

  if (score > 40) {
    return COLORS.amber;
  }

  return COLORS.accent;
};

export function MomentumCard({
  summary,
  onPress,
}: {
  summary: MomentumSummary;
  onPress: () => void;
}) {
  const color = getMomentumColor(summary.score);
  const widthPct = `${Math.max(10, Math.min(100, summary.score))}%`;

  return (
    <TouchableOpacity activeOpacity={0.85} style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.category} numberOfLines={1}>
          {summary.categoryName}
        </Text>
        <Text style={[styles.score, { color }]}>{summary.score}%</Text>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>{summary.completedCount} done</Text>
        <Text style={styles.metaText}>{summary.deferredCount} deferred</Text>
        <Text style={styles.metaText}>{summary.skippedCount} skipped</Text>
      </View>

      <View style={styles.barWrap}>
        <View style={[styles.barFill, { width: widthPct as any, backgroundColor: color }]} />
      </View>

      <Text style={styles.hint}>Tap to see what is driving this score.</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  category: {
    flex: 1,
    color: COLORS.textMuted,
    fontSize: 11,
    fontFamily: 'DMSans_500Medium',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  score: {
    fontSize: 24,
    fontFamily: 'DMSans_700Bold',
    letterSpacing: -0.6,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  metaText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontFamily: 'DMSans',
  },
  barWrap: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 12,
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
  },
  hint: {
    color: COLORS.textHint,
    fontSize: 12,
    fontFamily: 'DMSans',
  },
});
