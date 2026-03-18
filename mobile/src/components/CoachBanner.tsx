import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../constants';
import { useAppStore } from '../store';

export function CoachBanner() {
  const navigation = useNavigation<any>();
  const { coachBannerMsg } = useAppStore();

  return (
    <TouchableOpacity style={styles.container} activeOpacity={0.8} onPress={() => navigation.navigate('Chat')}>
      <View style={styles.border} />
      <View style={styles.content}>
        <Text style={styles.label}>COACH</Text>
        <Text style={styles.msg}>{coachBannerMsg}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { 
    backgroundColor: COLORS.surface, 
    borderRadius: 12, 
    flexDirection: 'row', 
    overflow: 'hidden', 
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(200, 242, 122, 0.1)', // Slight green tinge to border
  },
  border: { 
    width: 3, 
    backgroundColor: COLORS.accent 
  },
  content: { 
    padding: 16, 
    paddingVertical: 18,
    flex: 1 
  },
  label: { 
    color: COLORS.accent, 
    fontSize: 10, 
    fontFamily: 'DMSans_700Bold',
    letterSpacing: 1,
    marginBottom: 6,
    textTransform: 'uppercase'
  },
  msg: { 
    color: COLORS.textPrimary, 
    fontSize: 14, 
    fontFamily: 'DMSans',
    lineHeight: 22 
  }
});
