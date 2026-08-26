import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ArrowLeft, CircleHelp, Search, Zap } from 'lucide-react-native';
import { colors, radius, spacing, typography } from '../../theme';

interface ChatHeaderProps {
  onSearchPress?: () => void;
  onZapPress?: () => void;
  onBackPress?: () => void;
}

export function ChatHeader({ onSearchPress, onZapPress, onBackPress }: ChatHeaderProps) {
  return (
    <View style={styles.header}>
      {/* Back Button if present */}
      {onBackPress ? (
        <TouchableOpacity
          onPress={onBackPress}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      ) : null}

      {/* Left Avatar Badge */}
      <View style={styles.avatarBadge}>
        <CircleHelp size={20} color={colors.textInverse} strokeWidth={2.2} />
      </View>

      {/* Center Details */}
      <View style={styles.centerContainer}>
        <Text style={styles.title}>Checkout Concierge</Text>
        <View style={styles.subtitleRow}>
          <Text style={styles.agentSubtitle}>AI Commerce Agent</Text>
          <Text style={styles.dotSeparator}>•</Text>
          <View style={styles.onlineDot} />
          <Text style={styles.onlineText}>Online</Text>
          <View style={styles.testModePill}>
            <Text style={styles.testModeText}>TEST MODE</Text>
          </View>
        </View>
      </View>

      {/* Right Action Icons */}
      <View style={styles.rightActions}>
        <TouchableOpacity
          onPress={onZapPress}
          style={styles.iconButton}
          activeOpacity={0.7}
        >
          <Zap size={19} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onSearchPress}
          style={styles.iconButton}
          activeOpacity={0.7}
        >
          <Search size={19} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  avatarBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    ...typography.bodyBold,
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  agentSubtitle: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
  },
  dotSeparator: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
    marginHorizontal: 4,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
    marginRight: 3,
  },
  onlineText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.successText,
    fontWeight: '600',
    marginRight: 6,
  },
  testModePill: {
    backgroundColor: colors.testModeBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  testModeText: {
    ...typography.captionBold,
    fontSize: 9,
    color: colors.testModeText,
    letterSpacing: 0.5,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
