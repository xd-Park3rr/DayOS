import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants';
import { bus } from '../events/bus';

type ToastState = {
  kind: 'success' | 'info' | 'error';
  message: string;
  durationMs: number;
} | null;

const DEFAULT_DURATION_MS = 2800;

export function ToastHost() {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastState>(null);
  const translateY = useRef(new Animated.Value(-32)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const dismiss = () => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -24,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setToast(null);
      });
    };

    const unsub = bus.subscribe('ui.toast', ({ kind, message, durationMs }) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      setToast({
        kind,
        message,
        durationMs: durationMs || DEFAULT_DURATION_MS,
      });

      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 18,
          stiffness: 180,
          mass: 0.9,
        }),
      ]).start();

      timeoutRef.current = setTimeout(dismiss, durationMs || DEFAULT_DURATION_MS);
    });

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      unsub();
    };
  }, [opacity, translateY]);

  if (!toast) {
    return null;
  }

  const accentColor =
    toast.kind === 'error'
      ? COLORS.red
      : toast.kind === 'info'
        ? COLORS.accentBlue
        : COLORS.accent;

  return (
    <View pointerEvents="none" style={[styles.host, { top: insets.top + 10 }]}>
      <Animated.View
        style={[
          styles.toast,
          {
            borderColor: `${accentColor}55`,
            transform: [{ translateY }],
            opacity,
          },
        ]}
      >
        <View style={[styles.indicator, { backgroundColor: accentColor }]} />
        <Text style={styles.message}>{toast.message}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 1000,
  },
  toast: {
    width: '100%',
    maxWidth: 620,
    minHeight: 52,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: 'rgba(22, 24, 28, 0.96)',
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  message: {
    flex: 1,
    color: COLORS.textPrimary,
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    lineHeight: 19,
  },
});
