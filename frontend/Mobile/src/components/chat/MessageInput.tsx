import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Keyboard,
  Platform,
  StyleSheet,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { ArrowUp, Check } from 'lucide-react-native';
import { AIButton } from '../motion/AIButton';
import { colors, radius, shadows, spacing, typography, useThemeColors } from '../../theme';
import { motion } from '../../theme/motion';
import { useReduceMotion } from '../../hooks/motion/useReduceMotion';

interface MessageInputProps {
  onSendMessage: (text: string) => void;
  isLoading?: boolean;
  onMicPress?: () => void;
  floatingTabBarOffset?: boolean;
}

export function MessageInput({
  onSendMessage,
  isLoading = false,
  onMicPress,
  floatingTabBarOffset = false,
}: MessageInputProps) {
  const [text, setText] = useState('');
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [justSent, setJustSent] = useState(false);
  const reduceMotion = useReduceMotion();
  const themeColors = useThemeColors();

  const sendScale = useRef(new Animated.Value(1)).current;

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

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    setJustSent(true);
    onSendMessage(trimmed);
    setText('');

    setTimeout(() => {
      setJustSent(false);
    }, 1200);
  };

  const handleSendPressIn = () => {
    if (reduceMotion) return;
    Animated.timing(sendScale, {
      toValue: 0.90,
      duration: 100,
      easing: motion.easing.easeOut,
      useNativeDriver: true,
    }).start();
  };

  const handleSendPressOut = () => {
    if (reduceMotion) return;
    Animated.spring(sendScale, {
      toValue: 1,
      ...motion.spring.snappy,
    }).start();
  };

  const hasText = text.trim().length > 0;
  const bottomOffset = !isKeyboardVisible && floatingTabBarOffset
    ? (Platform.OS === 'ios' ? 84 : 76)
    : (Platform.OS === 'ios' ? 16 : spacing.sm);

  return (
    <View style={[styles.wrapper, { paddingBottom: bottomOffset }]}>
      <View style={[styles.floatingCapsule, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
        {/* Special AI Whisper Mic Button with Micro-interactions */}
        {onMicPress && (
          <AIButton
            icon="mic"
            size={36}
            onPress={onMicPress}
            accessibilityLabel="Voice search"
          />
        )}

        {/* Text Input Field */}
        <TextInput
          style={[styles.textInput, { color: themeColors.textPrimary }]}
          placeholder="Ask for items, budget, or advice..."
          placeholderTextColor={themeColors.textMuted}
          value={text}
          onChangeText={setText}
          multiline={false}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          editable={!isLoading}
          autoCapitalize="sentences"
        />

        {/* Tactile Send Button (Scale 1 -> 0.90 -> 1 with state feedback) */}
        <TouchableWithoutFeedback
          onPress={handleSend}
          onPressIn={handleSendPressIn}
          onPressOut={handleSendPressOut}
          disabled={!hasText || isLoading}
          accessibilityRole="button"
          accessibilityLabel="Send message"
        >
          <Animated.View
            style={[
              styles.sendButton,
              hasText
                ? [styles.sendButtonActive, { backgroundColor: themeColors.primary }]
                : [styles.sendButtonIdle, { backgroundColor: themeColors.backgroundSubtle }],
              { transform: [{ scale: sendScale }] },
            ]}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : justSent ? (
              <Check size={16} color="#FFFFFF" strokeWidth={2.5} />
            ) : (
              <ArrowUp
                size={16}
                color={hasText ? '#FFFFFF' : themeColors.textMuted}
                strokeWidth={hasText ? 2.5 : 2}
              />
            )}
          </Animated.View>
        </TouchableWithoutFeedback>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.xs,
    backgroundColor: 'transparent',
  },
  floatingCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 5,
    borderWidth: 1,
    ...shadows.card,
  },
  textInput: {
    flex: 1,
    ...typography.body,
    fontSize: 15,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonActive: {
    ...shadows.primaryButton,
  },
  sendButtonIdle: {},
});
