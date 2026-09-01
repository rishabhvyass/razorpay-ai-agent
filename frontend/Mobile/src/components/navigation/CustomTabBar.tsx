import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { LayoutGrid, ShoppingBag, Sparkles } from 'lucide-react-native';
import { colors, radius, shadows, typography, useThemeColors } from '../../theme';
import { motion } from '../../theme/motion';
import { useReduceMotion } from '../../hooks/motion/useReduceMotion';

interface TabItemProps {
  label: string;
  icon: React.ReactNode;
  isFocused: boolean;
  onPress: () => void;
}

function TabItem({ label, icon, isFocused, onPress }: TabItemProps) {
  const reduceMotion = useReduceMotion();
  const themeColors = useThemeColors();
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reduceMotion) return;

    if (isFocused) {
      Animated.sequence([
        Animated.timing(scale, {
          toValue: motion.scale.pop,
          duration: 120,
          easing: motion.easing.easeOut,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          ...motion.spring.snappy,
        }),
      ]).start();
    }
  }, [isFocused, reduceMotion, scale]);

  return (
    <TouchableOpacity
      style={[
        styles.tabItem,
        isFocused && [styles.tabItemFocused, { backgroundColor: themeColors.primarySubtle }],
      ]}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
    >
      <Animated.View style={[styles.iconContainer, { transform: [{ scale }] }]}>
        {icon}
      </Animated.View>
      <Text
        style={[
          styles.tabLabel,
          isFocused ? [styles.tabLabelFocused, { color: themeColors.primary }] : [styles.tabLabelInactive, { color: themeColors.textMuted }],
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const themeColors = useThemeColors();
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true),
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false),
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const currentRoute = state.routes[state.index];
  const isAIPage = currentRoute?.name === 'AITab' || currentRoute?.name === 'ChatTab';

  if (isKeyboardVisible || isAIPage) {
    return null;
  }

  const getTabInfo = (routeName: string, isFocused: boolean) => {
    switch (routeName) {
      case 'AITab':
      case 'ChatTab':
        return {
          label: 'Concierge',
          icon: <Sparkles size={18} color={isFocused ? themeColors.primary : themeColors.textMuted} />,
        };
      case 'ProductsTab':
        return {
          label: 'Catalog',
          icon: <LayoutGrid size={18} color={isFocused ? themeColors.primary : themeColors.textMuted} />,
        };
      case 'OrdersTab':
        return {
          label: 'Orders',
          icon: <ShoppingBag size={18} color={isFocused ? themeColors.primary : themeColors.textMuted} />,
        };
      default:
        return {
          label: routeName,
          icon: <Sparkles size={18} color={isFocused ? themeColors.primary : themeColors.textMuted} />,
        };
    }
  };

  return (
    <View style={styles.floatingContainer} pointerEvents="box-none">
      <View style={[styles.tabPill, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const { label, icon } = getTabInfo(route.name, isFocused);

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TabItem
              key={route.key}
              label={label}
              icon={icon}
              isFocused={isFocused}
              onPress={onPress}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 16,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.full,
    gap: 6,
  },
  tabItemFocused: {
    backgroundColor: colors.primarySubtle,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    ...typography.captionBold,
    fontSize: 13,
  },
  tabLabelFocused: {
    color: colors.primary,
    fontWeight: '700',
  },
  tabLabelInactive: {
    color: colors.textMuted,
    fontWeight: '500',
  },
});
