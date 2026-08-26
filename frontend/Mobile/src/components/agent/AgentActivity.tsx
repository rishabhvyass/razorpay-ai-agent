import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Check, ChevronDown, ChevronUp, Zap } from 'lucide-react-native';
import { AgentActivityAnimation } from '../motion/AgentActivityAnimation';
import { colors, radius, spacing, typography } from '../../theme';
import { AgentAction } from '../../types';
import { formatTime } from '../../utils/formatting';

interface AgentActivityProps {
  actions?: AgentAction[];
  isThinking?: boolean;
}

export function AgentActivity({ actions = [], isThinking = false }: AgentActivityProps) {
  const [expanded, setExpanded] = useState(true);

  if (actions.length === 0 && !isThinking) {
    return null;
  }

  const stepCount = actions.length || (isThinking ? 1 : 0);

  return (
    <View style={styles.container}>
      {/* Header Accordion Bar */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Zap size={14} color={colors.textMuted} style={styles.zapIcon} />
          <Text style={styles.headerTitle}>Agent Activity</Text>
          <Text style={styles.stepCountText}>{stepCount} {stepCount === 1 ? 'step' : 'steps'}</Text>
        </View>
        {expanded ? (
          <ChevronUp size={16} color={colors.textMuted} />
        ) : (
          <ChevronDown size={16} color={colors.textMuted} />
        )}
      </TouchableOpacity>

      {/* Collapsible Body */}
      {expanded && (
        <View style={styles.body}>
          {actions.map((act, index) => {
            const timeStr = formatTime(act.timestamp || new Date().toISOString());
            const displayTitle = act.toolName === 'search_products'
              ? 'Product searched'
              : act.toolName === 'create_order'
              ? 'Order drafted'
              : act.toolName === 'create_payment_link'
              ? 'Payment link created'
              : act.toolName.replace(/_/g, ' ');

            const queryParam = act.toolInput?.query || act.toolInput?.category || 'catalog';
            const displayDesc = act.toolName === 'search_products'
              ? `Searched catalog for "${queryParam}"`
              : act.toolName === 'create_order'
              ? 'Initiated order draft'
              : act.toolName === 'create_payment_link'
              ? 'Razorpay secure link issued'
              : act.status;

            return (
              <AgentActivityAnimation key={act.id} index={index}>
                <View style={styles.activityItem}>
                  <View style={styles.statusDot}>
                    <Check size={11} color={colors.success} strokeWidth={3} />
                  </View>
                  <View style={styles.content}>
                    <View style={styles.titleRow}>
                      <Text style={styles.itemTitle}>{displayTitle}</Text>
                      <Text style={styles.timestamp}>{timeStr}</Text>
                    </View>
                    <Text style={styles.itemDesc} numberOfLines={1}>
                      {displayDesc}
                    </Text>
                  </View>
                </View>
              </AgentActivityAnimation>
            );
          })}

          {isThinking && (
            <View style={styles.activityItem}>
              <View style={[styles.statusDot, styles.statusDotActive]} />
              <View style={styles.content}>
                <Text style={styles.itemTitle}>Processing tool execution...</Text>
                <Text style={styles.itemDesc}>Evaluating catalog parameters</Text>
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
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginVertical: spacing.xs + 2,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: colors.surfaceSubtle,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  zapIcon: {
    marginRight: 6,
  },
  headerTitle: {
    ...typography.captionBold,
    fontSize: 12,
    color: colors.textSecondary,
  },
  stepCountText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
    marginLeft: 6,
  },
  body: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
  },
  statusDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.successBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  statusDotActive: {
    backgroundColor: colors.primarySubtle,
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemTitle: {
    ...typography.captionBold,
    fontSize: 12,
    color: colors.textPrimary,
    textTransform: 'capitalize',
  },
  itemDesc: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  timestamp: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textTertiary,
  },
});
