import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArrowLeft, LayoutGrid, Mic, Moon, ShoppingBag, Sparkles, Sun } from 'lucide-react-native';
import { IconButton } from '../motion/IconButton';
import { useThemeStore } from '../../store/themeStore';
import { colors, radius, spacing, typography, useThemeColors } from '../../theme';

interface ChatHeaderProps {
  onSearchPress?: () => void;
  onBackPress?: () => void;
  onProductsPress?: () => void;
  onOrdersPress?: () => void;
}

export function ChatHeader({
  onSearchPress,
  onBackPress,
  onProductsPress,
  onOrdersPress,
}: ChatHeaderProps) {
  const isDark = useThemeStore((state) => state.isDark);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const themeColors = useThemeColors();

  return (
    <View style={[styles.header, { backgroundColor: themeColors.background, borderBottomColor: themeColors.border }]}>
      <View style={styles.leftContainer}>
        {onBackPress && (
          <IconButton
            size={36}
            onPress={onBackPress}
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={18} color={themeColors.textPrimary} />
          </IconButton>
        )}

        <View style={[styles.avatar, { backgroundColor: themeColors.primarySubtle }]}>
          <Sparkles size={15} color={themeColors.primary} />
        </View>

        <View style={styles.titleColumn}>
          <Text style={[styles.title, { color: themeColors.textPrimary }]}>Checkout Concierge</Text>
          <View style={styles.statusRow}>
            <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>AI Commerce Agent</Text>
            <Text style={[styles.dotSeparator, { color: themeColors.textMuted }]}>·</Text>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>Online</Text>
          </View>
        </View>
      </View>

      <View style={styles.rightContainer}>
        {/* Theme Mode Toggle Button */}
        <IconButton
          size={36}
          onPress={toggleTheme}
          accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? (
            <Sun size={16} color="#FBBF24" />
          ) : (
            <Moon size={16} color={themeColors.textSecondary} />
          )}
        </IconButton>

        {onProductsPress && (
          <IconButton
            size={36}
            onPress={onProductsPress}
            accessibilityLabel="View Products Catalog"
          >
            <LayoutGrid size={16} color={themeColors.textSecondary} />
          </IconButton>
        )}

        {onOrdersPress && (
          <IconButton
            size={36}
            onPress={onOrdersPress}
            accessibilityLabel="View Orders"
          >
            <ShoppingBag size={16} color={themeColors.textSecondary} />
          </IconButton>
        )}

        {onSearchPress && (
          <IconButton
            size={36}
            onPress={onSearchPress}
            accessibilityLabel="Voice search"
          >
            <Mic size={16} color={themeColors.textSecondary} />
          </IconButton>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleColumn: {
    justifyContent: 'center',
  },
  title: {
    ...typography.h3,
    fontSize: 15,
    fontWeight: '700',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  subtitle: {
    ...typography.caption,
    fontSize: 11,
  },
  dotSeparator: {
    ...typography.caption,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  onlineText: {
    ...typography.captionMedium,
    color: colors.success,
    fontSize: 11,
    fontWeight: '600',
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
