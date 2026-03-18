import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants';

interface ConsequenceCardProps {
  type: string;
  message: string;
}

export function ConsequenceCard({ type, message }: ConsequenceCardProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{type.toUpperCase()}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(242, 185, 122, 0.1)', // amber tint
    borderLeftWidth: 3,
    borderLeftColor: COLORS.amber,
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 12,
    alignSelf: 'flex-start',
    maxWidth: '85%'
  },
  label: {
    color: COLORS.amber,
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 4,
    letterSpacing: 0.5
  },
  message: {
    color: '#f0ede8', // text primary
    fontSize: 14,
    lineHeight: 20
  }
});
