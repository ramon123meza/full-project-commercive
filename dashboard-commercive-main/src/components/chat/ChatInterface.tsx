"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useStoreContext } from "@/context/StoreContext";
import { formatDate } from "@/app/utils/date";
import {
  IoSend,
  IoChatbubbleEllipsesOutline,
  IoCheckmarkDone,
  IoCheckmark,
  IoEllipsisHorizontal,
  IoClose,
  IoMenu,
  IoRefresh,
} from "react-icons/io5";
import { BiMessageSquareDetail } from "react-icons/bi";

const LAMBDA_URL = process.env.NEXT_PUBLIC_AWS_LAMBDA_URL || "";
const POLL_INTERVAL = 10000; // 10 seconds

// Types
interface Message {
  message_id: string;
  conversation_id: string;
  sender_type: "user" | "admin" | "ai";
  sender_id: string;
  message_text: string;
  created_at: number;
  is_read: boolean;
}

interface Conversation {
  conversation_id: string;
  user_id: string;
  store_url: string;
  status: "open" | "closed";
  created_at: number;
  updated_at: number;
  last_message: string;
  unread_admin: number;
  unread_user: number;
}

type ConnectionStatus = "connected" | "connecting" | "disconnected";

export default function ChatInterface() {
  const { selectedStore, userinfo } = useStoreContext();

  // State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connecting");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Client-side mounting state for hydration safety
  const [isMounted, setIsMounted] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const conversationPollRef = useRef<NodeJS.Timeout | null>(null);

  // Set mounted state after hydration
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Focus input when conversation changes (client-side only)
  useEffect(() => {
    if (isMounted && inputRef.current) {
      // Simple delayed focus after render
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [selectedConversation, isMounted]);

  // Fetch user's conversations
  const fetchConversations = useCallback(async () => {
    if (!userinfo?.id) return;

    try {
      const response = await fetch(
        `${LAMBDA_URL}?action=chat/conversations&user_id=${userinfo.id}`
      );
      const data = await response.json();

      if (data.conversations) {
        setConversations(data.conversations);
        setConnectionStatus("connected");
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
      setConnectionStatus("disconnected");
    }
  }, [userinfo?.id]);

  // Fetch messages for selected conversation
  const fetchMessages = useCallback(async (conversationId: string, showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const response = await fetch(
        `${LAMBDA_URL}?action=chat/messages&conversation_id=${conversationId}`
      );
      const data = await response.json();

      if (data.messages) {
        setMessages(data.messages);
        setConnectionStatus("connected");
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      setConnectionStatus("disconnected");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  // Mark messages as read
  const markMessagesAsRead = useCallback(async (conversationId: string) => {
    try {
      await fetch(LAMBDA_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "chat/mark-read",
          conversation_id: conversationId,
          reader_type: "user",
        }),
      });
      fetchConversations();
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  }, [fetchConversations]);

  // Send new message
  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || !userinfo?.id || !selectedStore?.store_url) {
      return;
    }

    const messageToSend = newMessage;
    setNewMessage(""); // Clear input immediately for better UX
    setSending(true);

    try {
      const response = await fetch(LAMBDA_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "chat/send",
          user_id: userinfo.id,
          store_url: selectedStore.store_url,
          message: messageToSend,
          conversation_id: selectedConversation?.conversation_id,
          enable_ai: true, // Enable AI responses
        }),
      });

      const data = await response.json();

      if (data.success) {
        // If this was a new conversation, update selected conversation
        if (!selectedConversation || data.is_new_conversation) {
          const newConv: Conversation = {
            conversation_id: data.conversation_id,
            user_id: userinfo.id,
            store_url: selectedStore.store_url,
            status: "open",
            created_at: Date.now(),
            updated_at: Date.now(),
            last_message: data.ai_response || messageToSend,
            unread_admin: 0,
            unread_user: data.ai_response ? 1 : 0,
          };
          setSelectedConversation(newConv);
          if (data.is_new_conversation) {
            setConversations((prev) => [newConv, ...prev.filter(c => c.conversation_id !== data.conversation_id)]);
          }
        }

        // Refresh messages to include user message and AI response
        const convId = selectedConversation?.conversation_id || data.conversation_id;
        if (convId) {
          await fetchMessages(convId, false);
        }

        // Refresh conversations list
        await fetchConversations();
      } else {
        // Restore message if send failed
        setNewMessage(messageToSend);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setNewMessage(messageToSend); // Restore message on error
    } finally {
      setSending(false);
    }
  }, [newMessage, userinfo?.id, selectedStore?.store_url, selectedConversation, fetchMessages, fetchConversations]);

  // Handle selecting a conversation
  const handleSelectConversation = useCallback((conversation: Conversation) => {
    setSelectedConversation(conversation);
    fetchMessages(conversation.conversation_id);

    // Mark messages as read
    if (conversation.unread_user > 0) {
      markMessagesAsRead(conversation.conversation_id);
    }

    // Start polling for new messages
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    pollIntervalRef.current = setInterval(() => {
      fetchMessages(conversation.conversation_id, false);
    }, POLL_INTERVAL);

    // Close sidebar on mobile
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, [fetchMessages, markMessagesAsRead]);

  // Start new conversation
  const handleNewConversation = useCallback(() => {
    setSelectedConversation(null);
    setMessages([]);
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
  }, []);

  // Load conversations on mount and start polling
  useEffect(() => {
    fetchConversations();

    conversationPollRef.current = setInterval(fetchConversations, POLL_INTERVAL);

    // Cleanup on unmount
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (conversationPollRef.current) {
        clearInterval(conversationPollRef.current);
      }
    };
  }, [fetchConversations]);

  // Handle Enter key to send message
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Calculate total unread messages
  const totalUnread = conversations.reduce((sum, conv) => sum + conv.unread_user, 0);

  // Connection status indicator
  const ConnectionIndicator = () => (
    <div className="flex items-center gap-2">
      <div
        className={`w-2 h-2 rounded-full ${
          connectionStatus === "connected"
            ? "bg-green-500"
            : connectionStatus === "connecting"
            ? "bg-yellow-500 animate-pulse"
            : "bg-red-500"
        }`}
      />
      <span className="text-tiny text-white/70">
        {connectionStatus === "connected"
          ? "Connected"
          : connectionStatus === "connecting"
          ? "Connecting..."
          : "Disconnected"}
      </span>
    </div>
  );

  // Show configuration error if Lambda URL is not set
  if (!LAMBDA_URL) {
    return (
      <div className="chat-container p-8 text-center">
        <div className="empty-state">
          <div className="empty-state-icon">
            <IoChatbubbleEllipsesOutline size={32} />
          </div>
          <h3 className="empty-state-title">Chat Service Unavailable</h3>
          <p className="empty-state-description">
            Chat service is not configured. Please contact support.
          </p>
        </div>
      </div>
    );
  }

  // Render placeholder during SSR to prevent hydration mismatch
  if (!isMounted) {
    return (
      <div className="chat-container h-full min-h-[400px] flex items-center justify-center">
        <div className="loader" />
      </div>
    );
  }

  return (
    <div className="chat-container flex h-full min-h-[400px] overflow-hidden">
      {/* Sidebar Toggle for Mobile */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="md:hidden fixed bottom-4 left-4 z-50 btn btn-primary btn-icon"
        aria-label="Toggle conversations"
      >
        {sidebarOpen ? <IoClose size={20} /> : <IoMenu size={20} />}
      </button>

      {/* Conversations Sidebar */}
      <div
        className={`
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0
          transition-transform duration-300
          absolute md:relative z-40
          w-80 md:w-1/3 lg:w-[320px]
          h-full flex flex-col
          bg-white border-r border-gray-200
        `}
      >
        {/* Sidebar Header */}
        <div className="chat-header flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BiMessageSquareDetail size={24} />
            <div>
              <h2 className="font-semibold text-lg">Messages</h2>
              <ConnectionIndicator />
            </div>
          </div>
          {totalUnread > 0 && (
            <span className="badge badge-error text-white bg-red-500">
              {totalUnread}
            </span>
          )}
        </div>

        {/* New Conversation Button */}
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={handleNewConversation}
            className="btn btn-primary w-full"
          >
            <IoChatbubbleEllipsesOutline size={18} />
            New Conversation
          </button>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {conversations.length === 0 ? (
            <div className="empty-state py-8">
              <div className="empty-state-icon mx-auto mb-4" style={{ width: 60, height: 60 }}>
                <BiMessageSquareDetail size={24} />
              </div>
              <p className="text-secondary-slate text-small">
                No conversations yet
              </p>
              <p className="text-secondary-slate text-tiny mt-1">
                Start a new conversation to get help
              </p>
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.conversation_id}
                onClick={() => handleSelectConversation(conv)}
                className={`
                  p-4 cursor-pointer transition-all duration-200
                  border-b border-gray-100 hover:bg-[var(--secondary-sky)]
                  ${selectedConversation?.conversation_id === conv.conversation_id
                    ? "bg-[var(--secondary-sky)] border-l-4 border-l-[var(--primary-blue)]"
                    : ""
                  }
                `}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-semibold text-[var(--primary-indigo)] text-small truncate flex-1 mr-2">
                    {conv.store_url}
                  </span>
                  {conv.unread_user > 0 && (
                    <span className="badge badge-error text-white bg-red-500 text-tiny px-2 py-0.5">
                      {conv.unread_user}
                    </span>
                  )}
                </div>
                <p className="text-[var(--secondary-slate)] text-small truncate">
                  {conv.last_message || "No messages"}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-tiny text-gray-400">
                    {formatDate(new Date(conv.updated_at).toISOString())}
                  </span>
                  <span
                    className={`text-tiny font-medium ${
                      conv.status === "open" ? "text-green-600" : "text-gray-400"
                    }`}
                  >
                    {conv.status === "open" ? "Active" : "Closed"}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-[var(--neutral-gray)] min-w-0 min-h-0 overflow-hidden">
        {selectedConversation === null && messages.length === 0 ? (
          // New Conversation View
          <>
            <div className="chat-header flex-shrink-0">
              <h2 className="font-semibold text-lg">New Conversation</h2>
              <p className="text-white/70 text-small">
                Chat with our AI assistant or request human support
              </p>
            </div>

            <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto" style={{ minHeight: 0 }}>
              <div className="text-center max-w-md">
                <div className="empty-state-icon mx-auto mb-6 bg-gradient-to-br from-purple-500 to-indigo-600" style={{ width: 100, height: 100 }}>
                  <IoChatbubbleEllipsesOutline size={48} />
                </div>
                <h3 className="text-h4 text-[var(--primary-indigo)] mb-2">
                  Chat with Our AI Assistant
                </h3>
                <p className="text-[var(--secondary-slate)] mb-6">
                  Get instant answers from our AI assistant! For complex issues,
                  type &quot;connect to representative&quot; to speak with our support team.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-4 text-small text-[var(--secondary-slate)]">
                  <div className="flex items-center gap-2">
                    <IoCheckmarkDone className="text-green-500" size={18} />
                    <span>Instant AI responses</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <IoCheckmarkDone className="text-green-500" size={18} />
                    <span>24/7 availability</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <IoCheckmarkDone className="text-green-500" size={18} />
                    <span>Human support on request</span>
                  </div>
                </div>
                <p className="text-tiny text-gray-400 mt-4">
                  Powered by AI with human backup support
                </p>
              </div>
            </div>

            {/* Message Input */}
            <div className="chat-input-container bg-white flex-shrink-0">
              <textarea
                ref={inputRef}
                rows={1}
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={sending}
                className="input flex-1 resize-none min-h-[44px] max-h-32"
                style={{ lineHeight: "1.5" }}
              />
              <button
                onClick={sendMessage}
                disabled={sending || !newMessage.trim()}
                className="btn btn-primary btn-icon disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? (
                  <div className="loader-sm border-white border-t-transparent" />
                ) : (
                  <IoSend size={20} />
                )}
              </button>
            </div>
          </>
        ) : (
          // Existing Conversation View
          <>
            {/* Chat Header */}
            <div className="chat-header flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="font-semibold text-lg">
                  {selectedConversation?.store_url || "Chat"}
                </h2>
                <div className="flex items-center gap-3 mt-1">
                  <span
                    className={`text-tiny font-medium px-2 py-0.5 rounded-full ${
                      selectedConversation?.status === "open"
                        ? "bg-green-500/20 text-green-300"
                        : "bg-gray-500/20 text-gray-300"
                    }`}
                  >
                    {selectedConversation?.status === "open" ? "Active" : "Closed"}
                  </span>
                  <ConnectionIndicator />
                </div>
              </div>
              <button
                onClick={() => fetchMessages(selectedConversation!.conversation_id)}
                className="btn btn-ghost btn-icon text-white hover:bg-white/10"
                title="Refresh messages"
              >
                <IoRefresh size={20} />
              </button>
            </div>

            {/* Messages Area */}
            <div
              className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-[var(--neutral-gray)]"
              style={{ minHeight: 0 }}
            >
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="loader mx-auto mb-4" />
                    <p className="text-[var(--secondary-slate)] text-small">
                      Loading messages...
                    </p>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <IoEllipsisHorizontal
                      size={48}
                      className="mx-auto mb-4 text-gray-300"
                    />
                    <p className="text-[var(--secondary-slate)]">
                      No messages yet
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg) => (
                    <div
                      key={msg.message_id}
                      className={`flex mb-4 ${
                        msg.sender_type === "user" ? "justify-end" : "justify-start"
                      } animate-fade-in`}
                    >
                      <div
                        className={`flex gap-3 max-w-[75%] ${
                          msg.sender_type === "user" ? "flex-row-reverse" : "flex-row"
                        }`}
                      >
                        {/* Avatar */}
                        <div
                          className={`avatar avatar-sm flex-shrink-0 ${
                            msg.sender_type === "user"
                              ? "bg-[var(--primary-blue)]"
                              : msg.sender_type === "ai"
                              ? "bg-gradient-to-br from-purple-500 to-indigo-600"
                              : "bg-[var(--secondary-slate)]"
                          }`}
                        >
                          {msg.sender_type === "user" ? "U" : msg.sender_type === "ai" ? "AI" : "S"}
                        </div>

                        {/* Message Content */}
                        <div className="flex flex-col">
                          {/* Sender label for AI messages */}
                          {msg.sender_type === "ai" && (
                            <span className="text-tiny text-purple-600 font-medium mb-1">
                              AI Assistant
                            </span>
                          )}
                          {msg.sender_type === "admin" && (
                            <span className="text-tiny text-gray-500 font-medium mb-1">
                              Support Team
                            </span>
                          )}
                          <div
                            className={`chat-message ${
                              msg.sender_type === "user"
                                ? "chat-message-user"
                                : msg.sender_type === "ai"
                                ? "chat-message-admin bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100"
                                : "chat-message-admin"
                            }`}
                          >
                            <p className="text-small whitespace-pre-wrap break-words">
                              {msg.message_text}
                            </p>
                          </div>

                          {/* Timestamp and Read Receipt */}
                          <div
                            className={`flex items-center gap-2 mt-1 ${
                              msg.sender_type === "user" ? "justify-end" : "justify-start"
                            }`}
                          >
                            <span className="text-tiny text-gray-400">
                              {formatDate(new Date(msg.created_at).toISOString())}
                            </span>
                            {msg.sender_type === "user" && (
                              <span className="text-gray-400">
                                {msg.is_read ? (
                                  <IoCheckmarkDone
                                    size={14}
                                    className="text-[var(--primary-blue)]"
                                  />
                                ) : (
                                  <IoCheckmark size={14} />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Message Input */}
            <div className="chat-input-container bg-white flex-shrink-0">
              <textarea
                ref={inputRef}
                rows={1}
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={sending || selectedConversation?.status === "closed"}
                className="input flex-1 resize-none min-h-[44px] max-h-32"
                style={{ lineHeight: "1.5" }}
              />
              <button
                onClick={sendMessage}
                disabled={
                  sending ||
                  !newMessage.trim() ||
                  selectedConversation?.status === "closed"
                }
                className="btn btn-primary btn-icon disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? (
                  <div className="loader-sm border-white border-t-transparent" />
                ) : (
                  <IoSend size={20} />
                )}
              </button>
            </div>

            {/* Closed Conversation Notice */}
            {selectedConversation?.status === "closed" && (
              <div className="bg-gray-100 px-4 py-2 text-center flex-shrink-0">
                <p className="text-small text-gray-500">
                  This conversation is closed. Start a new conversation to continue.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
