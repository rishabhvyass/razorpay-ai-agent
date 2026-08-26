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
import { Bot, List, ShoppingBag } from 'lucide-react-native';
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
        isFocused && styles.tabItemFocused,
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
          isFocused ? styles.tabLabelFocused : styles.tabLabelInactive,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
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

  if (isKeyboardVisible) {
    return null;
  }

  const getTabInfo = (routeName: string, isFocused: boolean) => {
    const iconColor = isFocused ? '#18181b' : '#71717a';
    const iconSize = 21;

    switch (routeName) {
      case 'ProductsTab':
      case 'ExploreTab':
        return {
          label: 'Products',
          icon: <ShoppingBag size={iconSize} color={iconColor} strokeWidth={isFocused ? 2.4 : 1.9} />,
        };
      case 'AITab':
      case 'ChatTab':
        return {
          label: 'AI',
          icon: <Bot size={iconSize} color={iconColor} strokeWidth={isFocused ? 2.4 : 1.9} />,
        };
      case 'OrdersTab':
      default:
        return {
          label: 'Order',
          icon: <List size={iconSize} color={iconColor} strokeWidth={isFocused ? 2.4 : 1.9} />,
        };
    }
  };

  return (
    <View style={styles.floatingWrapper} pointerEvents="box-none">
      <View style={styles.capsuleContainer}>
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
  floatingWrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 22 : 14,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  capsuleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 36,
    paddingHorizontal: 8,
    paddingVertical: 5,
    width: '84%',
    maxWidth: 340,
    height: 62,
    borderWidth: 1,
    borderColor: '#e4e4e7',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 28,
  },
  tabItemFocused: {
    backgroundColor: '#f4f4f5',
  },
  iconContainer: {
    marginBottom: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 11,
    letterSpacing: 0.2,
  },
  tabLabelFocused: {
    color: '#18181b',
    fontWeight: '700',
  },
  tabLabelInactive: {
    color: '#71717a',
    fontWeight: '500',
  },
});
