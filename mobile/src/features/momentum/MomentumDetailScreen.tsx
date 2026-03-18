import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../constants';
import { activityRepo } from '../../db/repositories';
import { aiService } from '../../services/ai/aiService';
import type { MomentumSummary, RecentMomentumBlock } from '../../types';

type MomentumInsight = {
  explanation: string;
  actions: string[];
};

const formatTime = (scheduledAt: string): string => {
  const parsed = new Date(scheduledAt);
  if (Number.isNaN(parsed.getTime())) {
    return scheduledAt;
  }

  return parsed.toLocaleString([], {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const formatStatus = (status: RecentMomentumBlock['status']): string => {
  if (status === 'done') {
    return 'Done';
  }

  if (status === 'deferred') {
    return 'Deferred';
  }

  if (status === 'skipped') {
    return 'Skipped';
  }

  return 'Overdue';
};

export function MomentumDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const categoryId = route.params?.categoryId as string;
  const [summary, setSummary] = useState<MomentumSummary | null>(null);
  const [insight, setInsight] = useState<MomentumInsight | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const nextSummary = activityRepo.getMomentumSummary(categoryId);
      if (!active) {
        return;
      }

      setSummary(nextSummary);
      if (!nextSummary) {
        setLoading(false);
        return;
      }

      const nextInsight = await aiService.generateMomentumInsight(nextSummary);
      if (!active) {
        return;
      }

      setInsight(nextInsight);
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [categoryId]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.label}>Momentum</Text>
            <Text style={styles.title}>{summary?.categoryName || 'Category'}</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>Home</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={COLORS.accent} style={styles.loader} />
        ) : !summary ? (
          <Text style={styles.emptyText}>There is not enough data yet for this category.</Text>
        ) : (
          <>
            <View style={styles.heroCard}>
              <Text style={styles.heroScore}>{summary.score}%</Text>
              <Text style={styles.heroCaption}>Momentum from your last 7 days of blocks</Text>
              <Text style={styles.heroAnchor}>
                {summary.identityAnchors[0] || 'Keep this category aligned.'}
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Why it looks like this</Text>
              <Text style={styles.sectionBody}>
                {insight?.explanation ||
                  `${summary.completedCount} done, ${summary.deferredCount} deferred, ${summary.skippedCount} skipped, ${summary.overdueCount} overdue.`}
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Recent block pattern</Text>
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{summary.completedCount}</Text>
                  <Text style={styles.statLabel}>Done</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{summary.deferredCount}</Text>
                  <Text style={styles.statLabel}>Deferred</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{summary.skippedCount}</Text>
                  <Text style={styles.statLabel}>Skipped</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{summary.overdueCount}</Text>
                  <Text style={styles.statLabel}>Overdue</Text>
                </View>
              </View>

              {summary.recentBlocks.map((block) => (
                <View key={block.logId} style={styles.blockRow}>
                  <View style={styles.blockText}>
                    <Text style={styles.blockTitle}>{block.title}</Text>
                    <Text style={styles.blockTime}>{formatTime(block.scheduledAt)}</Text>
                  </View>
                  <Text style={styles.blockStatus}>{formatStatus(block.status)}</Text>
                </View>
              ))}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>How to regain momentum</Text>
              {(insight?.actions || []).map((action) => (
                <View key={action} style={styles.actionRow}>
                  <View style={styles.actionDot} />
                  <Text style={styles.actionText}>{action}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 30,
    maxWidth: 760,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  headerText: {
    flex: 1,
  },
  label: {
    color: COLORS.textMuted,
    fontFamily: 'DMSans_700Bold',
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  title: {
    color: COLORS.textPrimary,
    fontFamily: 'DMSerifDisplay',
    fontSize: 32,
    lineHeight: 38,
  },
  backBtn: {
    paddingVertical: 6,
  },
  backText: {
    color: COLORS.textMuted,
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
  },
  loader: {
    marginTop: 40,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontFamily: 'DMSans',
    fontSize: 14,
  },
  heroCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 22,
    padding: 22,
    marginBottom: 20,
  },
  heroScore: {
    color: COLORS.textPrimary,
    fontFamily: 'DMSans_700Bold',
    fontSize: 44,
    letterSpacing: -1.2,
    marginBottom: 6,
  },
  heroCaption: {
    color: COLORS.textMuted,
    fontFamily: 'DMSans',
    fontSize: 13,
    marginBottom: 12,
  },
  heroAnchor: {
    color: COLORS.accent,
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    lineHeight: 22,
  },
  section: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
  },
  sectionLabel: {
    color: COLORS.textPrimary,
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
    marginBottom: 10,
  },
  sectionBody: {
    color: COLORS.textMuted,
    fontFamily: 'DMSans',
    fontSize: 14,
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  statCard: {
    minWidth: 72,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  statValue: {
    color: COLORS.textPrimary,
    fontFamily: 'DMSans_700Bold',
    fontSize: 18,
    marginBottom: 4,
  },
  statLabel: {
    color: COLORS.textMuted,
    fontFamily: 'DMSans',
    fontSize: 11,
  },
  blockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  blockText: {
    flex: 1,
  },
  blockTitle: {
    color: COLORS.textPrimary,
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    marginBottom: 4,
  },
  blockTime: {
    color: COLORS.textMuted,
    fontFamily: 'DMSans',
    fontSize: 12,
  },
  blockStatus: {
    color: COLORS.accent,
    fontFamily: 'DMSans_700Bold',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  actionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.accent,
    marginTop: 7,
  },
  actionText: {
    flex: 1,
    color: COLORS.textMuted,
    fontFamily: 'DMSans',
    fontSize: 14,
    lineHeight: 22,
  },
});
