import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { colors, spacing } from '../../theme';

export interface DividerProps {
  style?: ViewStyle;
  marginVertical?: number;
}

export function Divider({ style, marginVertical = spacing.md }: DividerProps) {
  return <View style={[styles.divider, { marginVertical }, style]} />;
}

const styles = StyleSheet.create({
  divider: {
    height: 1,
    backgroundColor: colors.border,
    width: '100%',
  },
});
