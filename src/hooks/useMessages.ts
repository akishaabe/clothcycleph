import { useEffect, useState } from 'react';
import { messageService } from '../services/api';
import { Message, Conversation, MessageContact } from '../types/api';

export function useMessages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [contacts, setContacts] = useState<MessageContact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeThreadUserId, setActiveThreadUserId] = useState<string | null>(null);

  const fetchContacts = async () => {
    setError(null);
    try {
      const response = await messageService.getContacts();
      setContacts(response.data);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const fetchConversations = async (options: { silent?: boolean } = {}) => {
    if (!options.silent) {
      setIsLoading(true);
    }
    setError(null);
    try {
      const response = await messageService.getConversations();
      setConversations(response.data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      if (!options.silent) {
        setIsLoading(false);
      }
    }
  };

  const fetchMessages = async (userId: string) => {
    setActiveThreadUserId(userId);
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
      setMessages((current) => {
        if (current.some((item) => item.id === response.data.id)) {
          return current;
        }

        return [...current, response.data];
      });
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
    contacts,
    isLoading,
    error,
    fetchContacts,
    fetchConversations,
    fetchMessages,
    sendMessage,
    markAsRead,
  };
}
