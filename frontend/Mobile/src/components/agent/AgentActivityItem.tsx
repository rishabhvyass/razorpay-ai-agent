import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  CreditCard,
  Lock,
  Search,
  Shield,
  XCircle,
} from 'lucide-react-native';
import { colors, radius, spacing, typography } from '../../theme';
import { AgentAction } from '../../types';
import { formatRelativeTime } from '../../utils/formatting';
import { Badge } from '../common/Badge';

export interface AgentActivityItemProps {
  action: AgentAction;
}

export function AgentActivityItem({ action }: AgentActivityItemProps) {
  const [expanded, setExpanded] = useState(false);

  const getActionDetails = () => {
    switch (action.toolName.toLowerCase()) {
      case 'search_products':
      case 'get_products':
        return {
          title: 'Searching Catalog',
          icon: <Search size={16} color={colors.info} />,
          bg: colors.infoBg,
        };
      case 'get_product':
      case 'get_product_details':
        return {
          title: 'Product Selected',
          icon: <Search size={16} color={colors.info} />,
          bg: colors.infoBg,
        };
      case 'create_order':
        return {
          title: action.status === 'blocked' ? 'Order Blocked (Unapproved)' : 'Order Created',
          icon: action.status === 'blocked' ? <Shield size={16} color={colors.warning} /> : <CreditCard size={16} color={colors.accent} />,
          bg: action.status === 'blocked' ? colors.warningBg : colors.accentLight,
        };
      case 'create_payment_link':
        return {
          title: 'Payment Link Generated',
          icon: <CreditCard size={16} color={colors.accent} />,
          bg: colors.accentLight,
        };
      case 'get_order_status':
      case 'verify_payment':
        return {
          title: 'Payment Verification',
          icon: <CheckCircle size={16} color={colors.success} />,
          bg: colors.successBg,
        };
      default:
        return {
          title: action.toolName.replace(/_/g, ' '),
          icon: <Lock size={16} color={colors.textSecondary} />,
          bg: colors.surfaceSubtle,
        };
    }
  };

  const details = getActionDetails();

  const getStatusBadge = () => {
    switch (action.status) {
      case 'success':
        return <Badge label="Success" variant="success" size="sm" />;
      case 'blocked':
        return <Badge label="Blocked (Safe)" variant="warning" size="sm" />;
      case 'failed':
        return <Badge label="Failed" variant="danger" size="sm" />;
      case 'started':
      default:
        return <Badge label="Started" variant="neutral" size="sm" />;
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setExpanded(!expanded)}
        style={styles.mainRow}
      >
        <View style={[styles.iconBox, { backgroundColor: details.bg }]}>
          {details.icon}
        </View>
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{details.title}</Text>
            {getStatusBadge()}
          </View>
          <Text style={styles.reason} numberOfLines={expanded ? undefined : 2}>
            {action.reason ?? `Executed tool: ${action.toolName}`}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.time}>{formatRelativeTime(action.createdAt || action.timestamp || new Date().toISOString())}</Text>
            <View style={styles.expandTrigger}>
              <Text style={styles.expandText}>{expanded ? 'Hide details' : 'View details'}</Text>
              {expanded ? (
                <ChevronUp size={12} color={colors.textMuted} />
              ) : (
                <ChevronDown size={12} color={colors.textMuted} />
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>

      {expanded ? (
        <View style={styles.expandedDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Tool Name:</Text>
            <Text style={styles.detailValueMono}>{action.toolName}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Action Type:</Text>
            <Text style={styles.detailValue}>{action.actionType}</Text>
          </View>
          {action.errorCode ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Error Code:</Text>
              <Text style={[styles.detailValue, styles.errorText]}>{action.errorCode}</Text>
            </View>
          ) : null}
          {action.errorMessage ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Message:</Text>
              <Text style={styles.detailValue}>{action.errorMessage}</Text>
            </View>
          ) : null}
          <View style={styles.rawBox}>
            <Text style={styles.rawLabel}>Input Payload (Redacted):</Text>
            <Text style={styles.rawJson}>
              {JSON.stringify(action.input ?? {}, null, 2)}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  mainRow: {
    flexDirection: 'row',
    padding: spacing.md,
    alignItems: 'flex-start',
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 14,
  },
  reason: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 6,
    lineHeight: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  time: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
  },
  expandTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  expandText: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
  },
  expandedDetails: {
    backgroundColor: colors.surfaceSubtle,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  detailLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  detailValue: {
    ...typography.captionMedium,
    color: colors.textPrimary,
  },
  detailValueMono: {
    ...typography.mono,
    fontSize: 11,
    color: colors.accent,
  },
  errorText: {
    color: colors.danger,
  },
  rawBox: {
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rawLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 10,
    marginBottom: 2,
  },
  rawJson: {
    ...typography.mono,
    fontSize: 10,
    color: colors.textSecondary,
    backgroundColor: colors.surface,
    padding: spacing.xs,
    borderRadius: radius.xs,
  },
});
