import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, SEVERITY_COLORS } from '../constants';
import { bus } from '../events/bus';

export function ActivityBlock({ activity }: { activity: any }) {
  const [expanded, setExpanded] = useState(false);
  const color =
    SEVERITY_COLORS[activity.severity as keyof typeof SEVERITY_COLORS] || COLORS.textMuted;

  const statusLabel =
    activity.status === 'done'
      ? 'Done'
      : activity.status === 'deferred'
        ? 'Deferred'
        : activity.status === 'skipped'
          ? 'Skipped'
          : activity.severity.charAt(0).toUpperCase() + activity.severity.slice(1);
  const isSettled = activity.status !== 'pending';
  const isDone = activity.status === 'done';
  const isDeferred = activity.status === 'deferred';
  const isSkipped = activity.status === 'skipped';
  const leftBorderColor = isSettled ? 'rgba(255,255,255,0.1)' : color;
  const opacity = isSettled ? 0.55 : 1;
  const badgeBackground = isDone
    ? COLORS.surfaceElevated
    : isDeferred
      ? 'rgba(122, 212, 242, 0.18)'
      : isSkipped
        ? 'rgba(242, 122, 122, 0.16)'
        : `${color}20`;
  const badgeColor = isDone
    ? COLORS.textMuted
    : isDeferred
      ? COLORS.accentBlue
      : isSkipped
        ? COLORS.red
        : color;

  const onAction = (action: 'completed' | 'skipped' | 'deferred') => {
    bus.emit(`activity.${action}` as any, {
      activityId: activity.activityId,
      logId: activity.logId,
      reason: '',
    });
    setExpanded(false);
  };

  const formattedTime = activity.scheduledAt
    ? new Date(activity.scheduledAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'All';

  return (
    <View style={styles.container}>
      <View style={styles.timelineCol}>
        <Text style={styles.time}>{formattedTime}</Text>
        <View style={styles.timelineNode}>
          <View
            style={[
              styles.dot,
              {
                backgroundColor: isSettled
                  ? isSkipped
                    ? COLORS.red
                    : isDeferred
                      ? COLORS.accentBlue
                      : COLORS.textHint
                  : color,
              },
            ]}
          />
          <View style={styles.line} />
        </View>
      </View>

      <View style={[styles.cardCol, { opacity }]}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => !isSettled && setExpanded(!expanded)}
          style={[styles.card, { borderLeftColor: leftBorderColor }]}
        >
          <Text style={styles.title}>{activity.title}</Text>
          <Text style={styles.subtitle}>
            {activity.categoryName} - {activity.windowMinutes} min
          </Text>

          <View style={[styles.badge, { backgroundColor: badgeBackground }]}>
            <Text style={[styles.badgeText, { color: badgeColor }]}>
              {statusLabel}
            </Text>
          </View>

          {expanded && !isSettled && (
            <View style={styles.actions}>
              <TouchableOpacity
                onPress={() => onAction('completed')}
                style={[styles.btn, { backgroundColor: COLORS.accent }]}
              >
                <Text style={[styles.btnText, { color: COLORS.background }]}>Done</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onAction('deferred')}
                style={[styles.btn, { backgroundColor: COLORS.surfaceElevated }]}
              >
                <Text style={styles.btnText}>Defer</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onAction('skipped')}
                style={[styles.btn, { backgroundColor: COLORS.surfaceElevated }]}
              >
                <Text style={[styles.btnText, { color: COLORS.red }]}>Skip</Text>
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  timelineCol: {
    width: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingRight: 10,
  },
  time: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontFamily: 'DMSans',
    marginTop: 18,
  },
  timelineNode: {
    alignItems: 'center',
    width: 20,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 20,
    zIndex: 1,
  },
  line: {
    position: 'absolute',
    top: 26,
    bottom: -20,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  cardCol: {
    flex: 1,
    paddingBottom: 4,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    padding: 14,
    borderLeftWidth: 2,
    borderWidth: 1,
    borderColor: 'transparent',
    borderTopColor: COLORS.border,
    borderRightColor: COLORS.border,
    borderBottomColor: COLORS.border,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontFamily: 'DMSans_700Bold',
    marginBottom: 4,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontFamily: 'DMSans',
    marginBottom: 10,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: 'DMSans_700Bold',
  },
  actions: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 8,
  },
  btn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  btnText: {
    color: COLORS.textPrimary,
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
  },
});
