import React, { useEffect, useState } from 'react';
import {
  Modal,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Mic, X } from 'lucide-react-native';
import { AnimatedPressable } from '../motion/AnimatedPressable';
import { IconButton } from '../motion/IconButton';
import { PulsingRing } from '../motion/PulsingRing';
import { VoiceWaveform } from '../motion/VoiceWaveform';
import { colors, radius, shadows, spacing, typography, useThemeColors } from '../../theme';

interface VoiceSearchModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmitQuery?: (query: string) => void;
}

export function VoiceSearchModal({
  visible,
  onClose,
  onSubmitQuery,
}: VoiceSearchModalProps) {
  const [seconds, setSeconds] = useState(0);
  const themeColors = useThemeColors();

  useEffect(() => {
    if (!visible) {
      setSeconds(0);
      return;
    }
    const interval = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [visible]);

  const handleSendQuery = (sampleQuery: string) => {
    onSubmitQuery?.(sampleQuery);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={false}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
        {/* Top Bar with Close */}
        <View style={styles.topBar}>
          <IconButton
            size={38}
            backgroundColor={themeColors.surface}
            onPress={onClose}
            accessibilityLabel="Close voice mode"
            style={[styles.closeBorder, { borderColor: themeColors.border }]}
          >
            <X size={18} color={themeColors.textPrimary} />
          </IconButton>
        </View>

        {/* Center Content */}
        <View style={styles.content}>
          {/* Status Capsule */}
          <View style={[styles.statusPill, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
            <View style={styles.pulseDot} />
            <Text style={[styles.statusText, { color: themeColors.textPrimary }]}>Listening...</Text>
            <Text style={[styles.timerText, { color: themeColors.textMuted }]}>00:0{Math.min(seconds, 9)}</Text>
          </View>

          {/* Concentric Microphone Hero with Soft Aura Rings */}
          <View style={styles.micCenterContainer}>
            <PulsingRing size={164} color={themeColors.primarySubtle} minScale={1.0} maxScale={1.12}>
              <PulsingRing size={120} color={themeColors.primarySubtle} minScale={1.0} maxScale={1.08}>
                <AnimatedPressable
                  style={[styles.micCircle, { backgroundColor: themeColors.primary }]}
                  pressScale={0.92}
                  onPress={() => handleSendQuery('Black hoodie under ₹2,000')}
                  accessibilityLabel="Tap microphone"
                >
                  <Mic size={32} color="#FFFFFF" strokeWidth={2.2} />
                </AnimatedPressable>
              </PulsingRing>
            </PulsingRing>
          </View>

          {/* Live Waveform Indicator */}
          <View style={styles.waveformWrapper}>
            <VoiceWaveform barCount={9} color={themeColors.primary} />
          </View>

          {/* User Instructions */}
          <Text style={[styles.instruction, { color: themeColors.textSecondary }]}>
            Tell your concierge what you're looking for, including budget or color preferences.
          </Text>

          {/* Quick Suggested Queries */}
          <View style={styles.quickPills}>
            <AnimatedPressable
              style={[styles.quickPill, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}
              pressScale={0.95}
              onPress={() => handleSendQuery('Black hoodie under ₹2,000')}
              accessibilityLabel="Sample search black hoodie"
            >
              <Text style={[styles.quickPillText, { color: themeColors.textPrimary }]}>"Black hoodie under ₹2,000"</Text>
            </AnimatedPressable>
            <AnimatedPressable
              style={[styles.quickPill, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}
              pressScale={0.95}
              onPress={() => handleSendQuery('Running shoes under ₹3,500')}
              accessibilityLabel="Sample search running shoes"
            >
              <Text style={[styles.quickPillText, { color: themeColors.textPrimary }]}>"Running shoes under ₹3,500"</Text>
            </AnimatedPressable>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  topBar: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: Platform.OS === 'ios' ? 4 : spacing.md,
    paddingBottom: spacing.sm,
    alignItems: 'flex-end',
  },
  closeBorder: {
    borderWidth: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.screenHorizontal,
    paddingBottom: spacing.xxl,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    marginBottom: spacing.xxl,
    gap: spacing.sm,
    ...shadows.subtle,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
  },
  statusText: {
    ...typography.captionBold,
    fontSize: 13,
  },
  timerText: {
    ...typography.captionMedium,
    fontSize: 12,
  },
  micCenterContainer: {
    width: 170,
    height: 170,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.lg,
  },
  micCircle: {
    width: 78,
    height: 78,
    borderRadius: 39,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.primaryButton,
  },
  waveformWrapper: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.lg,
  },
  instruction: {
    ...typography.body,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 22,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  quickPills: {
    gap: spacing.sm,
    width: '100%',
    maxWidth: 300,
  },
  quickPill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.inputs,
    borderWidth: 1,
    alignItems: 'center',
    ...shadows.subtle,
  },
  quickPillText: {
    ...typography.captionMedium,
    fontSize: 13,
  },
});
