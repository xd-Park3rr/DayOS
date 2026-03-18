import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { COLORS } from '../../constants';
import type { RuntimeCapabilitySnapshot } from '../../types';
import { runtimeDiagnosticsService } from '../../services/runtime/runtimeDiagnosticsService';

export function UnsupportedRuntimeScreen({
  snapshot,
}: {
  snapshot: RuntimeCapabilitySnapshot;
}) {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>Android Runtime Required</Text>
        <Text style={styles.title}>This DayOS session is blocked.</Text>
        <Text style={styles.body}>
          {snapshot.unsupportedReason ||
            'This runtime cannot execute DayOS native features.'}
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Current shell</Text>
          <Text style={styles.cardValue}>
            {runtimeDiagnosticsService.getShellLabel(snapshot.shellType)}
          </Text>
          <Text style={styles.cardMeta}>
            Execution environment: {snapshot.executionEnvironment || 'unknown'}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Missing native modules</Text>
          {snapshot.moduleStatus.map((module) => (
            <View key={module.key} style={styles.moduleRow}>
              <View style={styles.moduleText}>
                <Text style={styles.moduleName}>{module.label}</Text>
                <Text style={styles.moduleDetail}>{module.detail}</Text>
              </View>
              <Text
                style={[
                  styles.moduleStatus,
                  module.available ? styles.moduleAvailable : styles.moduleMissing,
                ]}
              >
                {module.available ? 'Present' : 'Missing'}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Required rebuild path</Text>
          <Text style={styles.command} selectable>
            cd C:\Users\colin\dev\DayOS\mobile
          </Text>
          <Text style={styles.command} selectable>
            npx expo run:android
          </Text>
          <Text style={styles.command} selectable>
            npx expo start --dev-client
          </Text>
          <Text style={styles.cardMeta}>
            Open the installed DayOS Android dev client after the rebuild. Do not
            use Expo Go for this app.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Diagnostics fingerprint</Text>
          <Text style={styles.fingerprint} selectable>
            {snapshot.debugFingerprint}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 72,
    paddingBottom: 40,
    gap: 16,
  },
  eyebrow: {
    color: COLORS.red,
    fontFamily: 'DMSans_700Bold',
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    color: COLORS.textPrimary,
    fontFamily: 'DMSerifDisplay',
    fontSize: 34,
    lineHeight: 40,
  },
  body: {
    color: COLORS.textMuted,
    fontFamily: 'DMSans',
    fontSize: 15,
    lineHeight: 24,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
  },
  cardTitle: {
    color: COLORS.textPrimary,
    fontFamily: 'DMSans_700Bold',
    fontSize: 14,
    marginBottom: 8,
  },
  cardValue: {
    color: COLORS.accent,
    fontFamily: 'DMSans_700Bold',
    fontSize: 18,
  },
  cardMeta: {
    color: COLORS.textMuted,
    fontFamily: 'DMSans',
    fontSize: 12,
    lineHeight: 20,
    marginTop: 8,
  },
  moduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
  },
  moduleText: {
    flex: 1,
  },
  moduleName: {
    color: COLORS.textPrimary,
    fontFamily: 'DMSans_500Medium',
  },
  moduleDetail: {
    color: COLORS.textHint,
    fontFamily: 'DMSans',
    fontSize: 11,
    marginTop: 4,
    lineHeight: 16,
  },
  moduleStatus: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 11,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  moduleAvailable: {
    color: COLORS.accent,
  },
  moduleMissing: {
    color: COLORS.red,
  },
  command: {
    color: COLORS.textPrimary,
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
  },
  fingerprint: {
    color: COLORS.textHint,
    fontFamily: 'DMSans',
    fontSize: 11,
    lineHeight: 18,
  },
});
