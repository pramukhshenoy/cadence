import React, { useState, useRef, useCallback } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, BottomTabInset } from '@/constants/theme';
import { useChatStream, type ChatMessage } from '@/hooks/use-chat-stream';

const MessageBubble = React.memo(function MessageBubble({ message }: { message: ChatMessage }) {
  const theme = useTheme();
  const isUser = message.role === 'user';
  return (
    <View style={[styles.bubbleRow, isUser ? styles.bubbleRowUser : styles.bubbleRowAssistant]}>
      <View
        style={[
          styles.bubble,
          isUser
            ? [styles.bubbleUser, { backgroundColor: theme.accent }]
            : [styles.bubbleAssistant, { backgroundColor: theme.backgroundElement, borderColor: theme.border }],
        ]}
      >
        {!isUser && message.content === '' ? (
          <Text style={[styles.bubbleText, { color: theme.textSecondary }]}>…</Text>
        ) : (
          <Text style={[styles.bubbleText, { color: isUser ? theme.accentForeground : theme.text }]}>
            {message.content}
          </Text>
        )}
      </View>
    </View>
  );
});

export default function ChatScreen() {
  const theme = useTheme();
  const { messages, isStreaming, error, send, newConversation } = useChatStream();
  const [input, setInput] = useState('');
  const flatListRef = useRef<FlatList<ChatMessage>>(null);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput('');
    send(text);
  }, [input, isStreaming, send]);

  const handleContentSizeChange = useCallback(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages.length]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Chat</Text>
          <Pressable
            onPress={newConversation}
            style={({ pressed }) => [
              styles.newButton,
              { backgroundColor: theme.backgroundElement, borderColor: theme.border },
              pressed && { opacity: 0.6 },
            ]}
            accessibilityLabel="New conversation"
          >
            <Text style={[styles.newButtonText, { color: theme.text }]}>New</Text>
          </Pressable>
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                Ask me anything about your tasks and habits.
              </Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <MessageBubble message={item} />}
              contentContainerStyle={styles.listContent}
              onContentSizeChange={handleContentSizeChange}
              keyboardShouldPersistTaps="handled"
            />
          )}

          {error !== null && (
            <View style={[styles.errorBanner, { backgroundColor: '#EF4444' }]}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={[styles.inputBar, { backgroundColor: theme.backgroundElement, borderTopColor: theme.border }]}>
            <TextInput
              style={[styles.textInput, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
              placeholder="Message"
              placeholderTextColor={theme.textSecondary}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={4000}
              onSubmitEditing={handleSend}
              blurOnSubmit={false}
              editable={!isStreaming}
            />
            <Pressable
              onPress={handleSend}
              disabled={!input.trim() || isStreaming}
              style={({ pressed }) => [
                styles.sendButton,
                { backgroundColor: theme.accent },
                (!input.trim() || isStreaming) && styles.sendButtonDisabled,
                pressed && { opacity: 0.7 },
              ]}
              accessibilityLabel="Send"
            >
              <Text style={[styles.sendButtonText, { color: theme.accentForeground }]}>↑</Text>
            </Pressable>
          </View>

          <View style={{ height: BottomTabInset }} />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  flex: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
    letterSpacing: -0.3,
  },
  newButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
    borderRadius: 20,
    borderWidth: 1,
  },
  newButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },

  listContent: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
    gap: Spacing.two,
  },

  bubbleRow: {
    flexDirection: 'row',
    marginVertical: Spacing.one,
  },
  bubbleRowUser: {
    justifyContent: 'flex-end',
  },
  bubbleRowAssistant: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 18,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  bubbleUser: {
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  bubbleText: {
    fontSize: 16,
    lineHeight: 22,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.five,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },

  errorBanner: {
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.two,
    padding: Spacing.two,
    borderRadius: 10,
  },
  errorText: {
    color: '#ffffff',
    fontSize: 14,
    textAlign: 'center',
  },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    gap: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    lineHeight: 22,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  sendButtonDisabled: {
    opacity: 0.35,
  },
  sendButtonText: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 22,
  },
});
