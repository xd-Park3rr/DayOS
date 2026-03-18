import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants';

export function DriftBar({ score, categoryName }: { score: number, categoryName: string }) {
  // Color mapping per manual
  let color = COLORS.accent; // green 0-40
  if (score > 40 && score <= 70) color = COLORS.amber;
  if (score > 70) color = COLORS.red;

  const widthPct = `${Math.max(10, Math.min(100, score))}%`;

  return (
    <View style={styles.container}>
      <Text style={styles.category} numberOfLines={1}>{categoryName}</Text>
      <Text style={styles.score}>{Math.round(score)}%</Text>
      <View style={styles.barWrap}>
        <View style={[styles.barFill, { width: widthPct as any, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.surface, 
    padding: 12, 
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  category: { 
    color: '#a3a3a3', // softer gray
    fontSize: 10, 
    fontFamily: 'DMSans_500Medium', 
    marginBottom: 8 
  },
  score: { 
    color: COLORS.textPrimary,
    fontSize: 22, 
    fontFamily: 'DMSans_700Bold', 
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  barWrap: { 
    height: 3, 
    backgroundColor: 'rgba(255,255,255,0.1)', 
    borderRadius: 1.5, 
    overflow: 'hidden' 
  },
  barFill: { 
    height: '100%', 
    borderRadius: 1.5 
  }
});
