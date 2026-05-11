import { useState } from 'react';
import { messageService } from '../services/api';
import { Message, Conversation } from '../types/api';

export function useMessages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await messageService.getConversations();
      setConversations(response.data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async (userId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await messageService.getMessages(userId);
      setMessages(response.data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (toUserId: string, content: string) => {
    setError(null);
    try {
      const response = await messageService.sendMessage({
        to_user_id: toUserId,
        content,
      });
      setMessages([...messages, response.data]);
      return response.data;
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  };

  const markAsRead = async (messageId: string) => {
    setError(null);
    try {
      const response = await messageService.markMessageAsRead(messageId);
      setMessages(
        messages.map((msg) => (msg.id === messageId ? response.data : msg))
      );
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  };

  return {
    messages,
    conversations,
    isLoading,
    error,
    fetchConversations,
    fetchMessages,
    sendMessage,
    markAsRead,
  };
}
