import React, { useEffect, useState } from 'react';
import {
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MessageSquare, Mic, Settings, X } from 'lucide-react-native';
import { PulsingRing } from '../motion/PulsingRing';
import { SlideUpView } from '../motion/SlideUpView';
import { VoiceWaveform } from '../motion/VoiceWaveform';
import { colors, radius, spacing, typography } from '../../theme';
import { motion } from '../../theme/motion';

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
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  useEffect(() => {
    if (!visible) {
      setRecordingSeconds(0);
      return;
    }

    const timer = setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [visible]);

  const formattedTimer = `00:0${Math.min(recordingSeconds, 9)}`;

  const handleStopRecording = () => {
    onSubmitQuery?.('Can you recommend running shoes under ₹3,500?');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={false}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          {/* Top Pill Badge */}
          <SlideUpView distance={8} duration={motion.duration.fast}>
            <View style={styles.listeningPill}>
              <View style={styles.purpleDot} />
              <Mic size={14} color={colors.primary} style={styles.micIcon} />
              <Text style={styles.listeningText}>Concierge is listening...</Text>
              <Text style={styles.timerText}>{formattedTimer}</Text>
            </View>
          </SlideUpView>

          {/* Center Speech Transcription */}
          <SlideUpView distance={12} delay={60} duration={motion.duration.normal} style={styles.transcriptionWrapper}>
            <View style={styles.transcriptionContainer}>
              <Text style={styles.transcriptionLine}>
                <Text style={styles.faintText}>Can you recommend </Text>
              </Text>
              <Text style={styles.transcriptionLine}>
                <Text style={styles.boldText}>running shoes </Text>
                <Text style={styles.faintText}>under</Text>
              </Text>
              <Text style={styles.transcriptionLine}>
                <Text style={styles.boldText}>₹3,500</Text>
                <Text style={styles.questionMark}>?</Text>
              </Text>
            </View>
          </SlideUpView>

          {/* Bottom Waveform & Controls */}
          <View style={styles.bottomSection}>
            {/* Animated Equalizer Waveform */}
            <View style={styles.waveformContainer}>
              <VoiceWaveform active={visible} color={colors.primary} barCount={8} />
            </View>

            {/* Pulsing Central Mic Ring & Button */}
            <View style={styles.micButtonContainer}>
              <PulsingRing size={96} color={colors.primarySubtle} maxScale={1.2}>
                <TouchableOpacity
                  style={styles.mainMicButton}
                  onPress={handleStopRecording}
                  activeOpacity={0.85}
                  accessibilityLabel="Stop recording and submit"
                >
                  <Mic size={26} color={colors.textInverse} strokeWidth={2.4} />
                </TouchableOpacity>
              </PulsingRing>
            </View>

            {/* Bottom Action Row */}
            <View style={styles.bottomActions}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.textButton}
                onPress={handleStopRecording}
                activeOpacity={0.8}
              >
                <Text style={styles.textButtonLabel}>Search Concierge</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.iconButton}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Settings size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    justifyContent: 'space-between',
  },
  listeningPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryUltraLight,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.testModeBorder,
  },
  purpleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginRight: 6,
  },
  micIcon: {
    marginRight: 6,
  },
  listeningText: {
    ...typography.captionBold,
    fontSize: 12,
    color: colors.primary,
  },
  timerText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.primaryDark,
    marginLeft: 8,
    fontVariant: ['tabular-nums'],
  },
  transcriptionWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  transcriptionContainer: {
    paddingVertical: spacing.xl,
  },
  transcriptionLine: {
    marginBottom: 4,
  },
  faintText: {
    ...typography.h1,
    fontSize: 32,
    color: colors.textTertiary,
    fontWeight: '700',
    lineHeight: 42,
  },
  boldText: {
    ...typography.h1,
    fontSize: 32,
    color: colors.textPrimary,
    fontWeight: '700',
    lineHeight: 42,
  },
  questionMark: {
    ...typography.h1,
    fontSize: 32,
    color: colors.primary,
    fontWeight: '700',
    lineHeight: 42,
  },
  bottomSection: {
    alignItems: 'center',
  },
  waveformContainer: {
    marginBottom: spacing.lg,
  },
  micButtonContainer: {
    marginBottom: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainMicButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  bottomActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: spacing.sm,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  textButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
  },
  textButtonLabel: {
    ...typography.captionBold,
    color: colors.textInverse,
    fontSize: 13,
  },
});
