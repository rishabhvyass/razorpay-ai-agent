import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Check, ChevronDown, ChevronUp, Clock, Sparkles } from 'lucide-react-native';
import { AgentActivityAnimation } from '../motion/AgentActivityAnimation';
import { colors, radius, shadows, spacing, typography, useThemeColors } from '../../theme';
import { AgentAction } from '../../types';
import { formatTime } from '../../utils/formatting';

interface AgentActivityProps {
  actions?: AgentAction[];
  isThinking?: boolean;
}

export function AgentActivity({ actions = [], isThinking = false }: AgentActivityProps) {
  const [expanded, setExpanded] = useState(false);
  const themeColors = useThemeColors();

  if (actions.length === 0 && !isThinking) {
    return null;
  }

  const stepCount = actions.length || (isThinking ? 1 : 0);

  const getActionCategory = (toolName: string): { label: 'AI DECISION' | 'SYSTEM ACTION' | 'RAZORPAY VERIFIED'; bg: string; text: string } => {
    const name = toolName.toLowerCase();
    if (name.includes('search') || name.includes('recommend') || name.includes('select') || name.includes('catalog')) {
      return { label: 'AI DECISION', bg: themeColors.primarySubtle, text: themeColors.primary };
    }
    if (name.includes('payment') || name.includes('webhook') || name.includes('verify') || name.includes('captured')) {
      return { label: 'RAZORPAY VERIFIED', bg: themeColors.successBg, text: themeColors.successText };
    }
    return { label: 'SYSTEM ACTION', bg: themeColors.neutralBg, text: themeColors.textSecondary };
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
      {/* Header Accordion Bar */}
      <TouchableOpacity
        style={[styles.header, { backgroundColor: themeColors.surface }]}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.75}
      >
        <View style={styles.headerLeft}>
          <View style={[styles.iconCircle, { backgroundColor: themeColors.primarySubtle }]}>
            <Sparkles size={13} color={themeColors.primary} />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>Agent Activity</Text>
            <Text style={[styles.headerSubtitle, { color: themeColors.textSecondary }]}>See what your concierge is doing</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <View style={[styles.stepBadge, { backgroundColor: themeColors.backgroundSubtle }]}>
            <Text style={[styles.stepBadgeText, { color: themeColors.textSecondary }]}>
              {stepCount} {stepCount === 1 ? 'step' : 'steps'}
            </Text>
          </View>
          {expanded ? (
            <ChevronUp size={16} color={themeColors.textMuted} />
          ) : (
            <ChevronDown size={16} color={themeColors.textMuted} />
          )}
        </View>
      </TouchableOpacity>

      {/* Collapsible Body */}
      {expanded && (
        <View style={[styles.body, { backgroundColor: themeColors.surfaceSubtle, borderTopColor: themeColors.borderSubtle }]}>
          {actions.map((act, index) => {
            const timeStr = formatTime(act.timestamp || new Date().toISOString());
            const cat = getActionCategory(act.toolName);

            const displayTitle =
              act.toolName === 'search_products'
                ? 'Searching products'
                : act.toolName === 'get_product'
                ? 'Product selected'
                : act.toolName === 'create_order'
                ? 'Razorpay order created'
                : act.toolName === 'create_payment_link'
                ? 'Payment link generated'
                : act.toolName === 'verify_payment'
                ? 'Payment verified'
                : act.toolName.replace(/_/g, ' ');

            const queryParam = act.toolInput?.query || act.toolInput?.category || 'catalog';
            const displayDesc =
              act.toolName === 'search_products'
                ? `Discovered curated options matching "${queryParam}"`
                : act.toolName === 'get_product'
                ? 'Inspected product specifications and verified pricing'
                : act.toolName === 'create_order'
                ? 'Server computed total from PostgreSQL in minor units'
                : act.toolName === 'create_payment_link'
                ? 'Created Razorpay test-mode checkout session'
                : act.toolName === 'verify_payment'
                ? 'Cryptographically verified with Razorpay HMAC webhook'
                : act.status;

            return (
              <AgentActivityAnimation key={act.id || index} index={index}>
                <View style={styles.activityItem}>
                  <View style={styles.statusDot}>
                    <Check size={10} color={colors.success} strokeWidth={3} />
                  </View>
                  <View style={styles.content}>
                    <View style={styles.titleRow}>
                      <Text style={styles.itemTitle}>{displayTitle}</Text>
                      <View style={[styles.categoryTag, { backgroundColor: cat.bg }]}>
                        <Text style={[styles.categoryTagText, { color: cat.text }]}>
                          {cat.label}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.itemDesc} numberOfLines={2}>
                      {displayDesc}
                    </Text>
                    <Text style={styles.timestamp}>{timeStr}</Text>
                  </View>
                </View>
              </AgentActivityAnimation>
            );
          })}

          {isThinking && (
            <View style={styles.activityItem}>
              <View style={styles.statusDotPending}>
                <Clock size={10} color={colors.warning} />
              </View>
              <View style={styles.content}>
                <View style={styles.titleRow}>
                  <Text style={styles.itemTitle}>Processing next step</Text>
                  <View style={[styles.categoryTag, { backgroundColor: colors.warningBg }]}>
                    <Text style={[styles.categoryTagText, { color: colors.warningText }]}>
                      SYSTEM ACTION
                    </Text>
                  </View>
                </View>
                <Text style={styles.itemDesc}>Evaluating context and preparing recommendations...</Text>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.cards,
    borderWidth: 1,
    borderColor: colors.border,
    marginVertical: spacing.sm,
    overflow: 'hidden',
    ...shadows.subtle,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.cardPadding,
    paddingVertical: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  stepBadge: {
    backgroundColor: colors.backgroundSubtle,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  stepBadgeText: {
    ...typography.captionBold,
    color: colors.textSecondary,
    fontSize: 11,
  },
  body: {
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingHorizontal: spacing.cardPadding,
    paddingVertical: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.surfaceSubtle,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm + 2,
  },
  statusDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.successBg,
    borderWidth: 1,
    borderColor: colors.successBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  statusDotPending: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.warningBg,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  itemTitle: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  categoryTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.small,
  },
  categoryTagText: {
    ...typography.captionBold,
    fontSize: 9,
    letterSpacing: 0.3,
  },
  itemDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 16,
    marginTop: 1,
  },
  timestamp: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
});
