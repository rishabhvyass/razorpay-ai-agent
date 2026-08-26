import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../../theme';

export interface AgentStatusProps {
  online?: boolean;
  modelName?: string;
}

export function AgentStatus({ online = true, modelName = 'Checkout Concierge AI' }: AgentStatusProps) {
  return (
    <View style={styles.container}>
      <View style={[styles.dot, online ? styles.dotOnline : styles.dotOffline]} />
      <Text style={styles.text}>{online ? 'Agent Active' : 'Agent Offline'}</Text>
      <Text style={styles.modelText}>· {modelName}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs + 2,
  },
  dotOnline: {
    backgroundColor: colors.success,
  },
  dotOffline: {
    backgroundColor: colors.danger,
  },
  text: {
    ...typography.captionBold,
    color: colors.textPrimary,
  },
  modelText: {
    ...typography.caption,
    color: colors.textMuted,
    marginLeft: 4,
  },
});
