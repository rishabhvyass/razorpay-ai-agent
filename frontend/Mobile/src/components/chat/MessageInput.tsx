import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ArrowUp, Mic, Paperclip } from 'lucide-react-native';
import { colors, radius, spacing, typography } from '../../theme';

interface MessageInputProps {
  onSendMessage: (text: string) => void;
  isLoading?: boolean;
  onMicPress?: () => void;
  onAttachPress?: () => void;
  floatingTabBarOffset?: boolean;
}

export function MessageInput({
  onSendMessage,
  isLoading = false,
  onMicPress,
  onAttachPress,
  floatingTabBarOffset = false,
}: MessageInputProps) {
  const [text, setText] = useState('');
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

  const handleSend = () => {
    if (!text.trim() || isLoading) return;
    onSendMessage(text.trim());
    setText('');
  };

  const containerMarginBottom = isKeyboardVisible
    ? Platform.OS === 'ios' ? 6 : 4
    : floatingTabBarOffset
    ? Platform.OS === 'ios' ? 76 : 68
    : 0;

  return (
    <View style={[styles.container, { marginBottom: containerMarginBottom }]}>
      <View style={styles.inputPill}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onMicPress}
          activeOpacity={0.7}
          accessibilityLabel="Voice search"
        >
          <Mic size={19} color={colors.textMuted} />
        </TouchableOpacity>

        <TextInput
          style={styles.textInput}
          value={text}
          onChangeText={setText}
          placeholder="Ask Concierge..."
          placeholderTextColor={colors.textTertiary}
          multiline={false}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          editable={!isLoading}
        />

        <TouchableOpacity
          style={styles.iconButton}
          onPress={onAttachPress}
          activeOpacity={0.7}
          accessibilityLabel="Attach file"
        >
          <Paperclip size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[
          styles.sendButton,
          text.trim().length > 0 ? styles.sendButtonActive : styles.sendButtonInactive,
        ]}
        onPress={handleSend}
        disabled={isLoading || text.trim().length === 0}
        activeOpacity={0.85}
        accessibilityLabel="Send message"
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={colors.textInverse} />
        ) : (
          <ArrowUp size={19} color={colors.textInverse} strokeWidth={2.6} />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 8 : 10,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    gap: 8,
  },
  inputPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 8,
    height: 48,
  },
  iconButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    ...typography.body,
    fontSize: 15,
    color: colors.textPrimary,
    paddingHorizontal: spacing.xs,
    paddingVertical: 0,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  sendButtonActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
  },
  sendButtonInactive: {
    backgroundColor: colors.primary,
    opacity: 0.85,
    shadowColor: colors.primary,
  },
});
