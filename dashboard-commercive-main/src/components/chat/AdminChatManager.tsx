"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useStoreContext } from "@/context/StoreContext";
import { formatDate } from "@/app/utils/date";
import {
  IoSend,
  IoChatbubbleEllipsesOutline,
  IoCheckmarkDone,
  IoClose,
  IoFilter,
  IoRefresh,
} from "react-icons/io5";
import { BiMessageSquareDetail } from "react-icons/bi";

const LAMBDA_URL = process.env.NEXT_PUBLIC_AWS_LAMBDA_URL || "";
const POLL_INTERVAL = 10000;

// Dark theme colors for admin
const colors = {
  bg: "#1B1F3B",
  card: "#252A4A",
  accent: "#3A6EA5",
  accentHover: "#4A7EB5",
  white: "#FFFFFF",
  muted: "#94A3B8",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  border: "#374151",
  inputBg: "#1B1F3B",
};

interface Message {
  message_id: string;
  conversation_id: string;
  sender_type: "user" | "admin";
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

export default function AdminChatManager() {
  const { userinfo } = useStoreContext();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [replyMessage, setReplyMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"open" | "closed" | "all">("open");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setReplyMessage(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  };

  const fetchConversations = useCallback(async () => {
    try {
      const url = statusFilter === "all"
        ? `${LAMBDA_URL}?action=admin/conversations&limit=100`
        : `${LAMBDA_URL}?action=admin/conversations&status=${statusFilter}&limit=100`;

      const response = await fetch(url);

      if (!response.ok) {
        console.error(`Error fetching conversations: ${response.status}`);
        setConversations([]);
        return;
      }

      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      setConversations([]);
    }
  }, [statusFilter]);

  const fetchMessages = useCallback(async (conversationId: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `${LAMBDA_URL}?action=chat/messages&conversation_id=${conversationId}`
      );
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const sendReply = async () => {
    if (!replyMessage.trim() || !userinfo?.id || !selectedConversation) {
      return;
    }

    setSending(true);
    try {
      const response = await fetch(LAMBDA_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "chat/reply",
          conversation_id: selectedConversation.conversation_id,
          admin_id: userinfo.id,
          message: replyMessage,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setReplyMessage("");
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
        }
        await fetchMessages(selectedConversation.conversation_id);
        await fetchConversations();
      }
    } catch (error) {
      console.error("Error sending reply:", error);
    } finally {
      setSending(false);
    }
  };

  const closeConversation = async (conversationId: string) => {
    try {
      const response = await fetch(LAMBDA_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "chat/close",
          conversation_id: conversationId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        await fetchConversations();
        if (selectedConversation?.conversation_id === conversationId) {
          setSelectedConversation(null);
          setMessages([]);
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
          }
        }
      }
    } catch (error) {
      console.error("Error closing conversation:", error);
    }
  };

  const markMessagesAsRead = async (conversationId: string) => {
    try {
      await fetch(LAMBDA_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "chat/mark-read",
          conversation_id: conversationId,
          reader_type: "admin",
        }),
      });
      fetchConversations();
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  };

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    fetchMessages(conversation.conversation_id);

    if (conversation.unread_admin > 0) {
      markMessagesAsRead(conversation.conversation_id);
    }

    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    pollIntervalRef.current = setInterval(() => {
      fetchMessages(conversation.conversation_id);
    }, POLL_INTERVAL);
  };

  useEffect(() => {
    fetchConversations();
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [fetchConversations]);

  useEffect(() => {
    const interval = setInterval(fetchConversations, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendReply();
    }
  };

  if (!LAMBDA_URL) {
    return (
      <div
        style={{
          backgroundColor: colors.card,
          borderRadius: "16px",
          padding: "32px",
          textAlign: "center",
          border: `1px solid ${colors.border}`,
        }}
      >
        <p style={{ color: colors.error, fontSize: "16px" }}>
          Chat service is not configured. Please contact support.
        </p>
      </div>
    );
  }

  const unreadCount = conversations.filter((c) => c.unread_admin > 0).length;

  return (
    <div
      style={{
        display: "flex",
        gap: "16px",
        height: "calc(100vh - 280px)",
        minHeight: "500px",
        maxHeight: "800px",
      }}
    >
      {/* Conversations List - Left Panel */}
      <div
        style={{
          width: "350px",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          backgroundColor: colors.card,
          borderRadius: "16px",
          border: `1px solid ${colors.border}`,
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px",
            background: `linear-gradient(135deg, ${colors.accent} 0%, ${colors.bg} 100%)`,
            borderBottom: `1px solid ${colors.border}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <BiMessageSquareDetail size={24} color={colors.white} />
              <span style={{ color: colors.white, fontWeight: 600, fontSize: "16px" }}>
                Conversations
              </span>
            </div>
            {unreadCount > 0 && (
              <span
                style={{
                  backgroundColor: colors.error,
                  color: colors.white,
                  padding: "4px 10px",
                  borderRadius: "12px",
                  fontSize: "12px",
                  fontWeight: 600,
                }}
              >
                {unreadCount} unread
              </span>
            )}
          </div>
        </div>

        {/* Filter */}
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${colors.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <IoFilter size={16} color={colors.muted} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "open" | "closed" | "all")}
              style={{
                flex: 1,
                backgroundColor: colors.inputBg,
                color: colors.white,
                border: `1px solid ${colors.border}`,
                borderRadius: "8px",
                padding: "8px 12px",
                fontSize: "14px",
                cursor: "pointer",
                outline: "none",
              }}
            >
              <option value="all">All Conversations</option>
              <option value="open">Open Only</option>
              <option value="closed">Closed Only</option>
            </select>
            <button
              onClick={() => fetchConversations()}
              style={{
                backgroundColor: colors.accent,
                border: "none",
                borderRadius: "8px",
                padding: "8px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IoRefresh size={16} color={colors.white} />
            </button>
          </div>
        </div>

        {/* Conversations List */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
          }}
          className="custom-scrollbar"
        >
          {conversations.length === 0 ? (
            <div style={{ padding: "32px", textAlign: "center" }}>
              <IoChatbubbleEllipsesOutline size={48} color={colors.muted} style={{ marginBottom: "12px" }} />
              <p style={{ color: colors.muted, fontSize: "14px" }}>
                No {statusFilter !== "all" ? statusFilter : ""} conversations
              </p>
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.conversation_id}
                onClick={() => handleSelectConversation(conv)}
                style={{
                  padding: "16px",
                  cursor: "pointer",
                  borderBottom: `1px solid ${colors.border}`,
                  backgroundColor:
                    selectedConversation?.conversation_id === conv.conversation_id
                      ? colors.accent + "30"
                      : conv.unread_admin > 0
                      ? colors.warning + "15"
                      : "transparent",
                  transition: "background-color 0.2s",
                }}
                onMouseEnter={(e) => {
                  if (selectedConversation?.conversation_id !== conv.conversation_id) {
                    e.currentTarget.style.backgroundColor = colors.border + "50";
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedConversation?.conversation_id !== conv.conversation_id) {
                    e.currentTarget.style.backgroundColor =
                      conv.unread_admin > 0 ? colors.warning + "15" : "transparent";
                  }
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                  <span style={{ color: colors.white, fontWeight: 600, fontSize: "14px" }}>
                    {conv.store_url || "Unknown Store"}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    {conv.status === "closed" && (
                      <span
                        style={{
                          backgroundColor: colors.muted + "30",
                          color: colors.muted,
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontSize: "10px",
                          fontWeight: 500,
                        }}
                      >
                        Closed
                      </span>
                    )}
                    {conv.unread_admin > 0 && (
                      <span
                        style={{
                          backgroundColor: colors.error,
                          color: colors.white,
                          padding: "2px 8px",
                          borderRadius: "10px",
                          fontSize: "11px",
                          fontWeight: 600,
                        }}
                      >
                        {conv.unread_admin}
                      </span>
                    )}
                  </div>
                </div>
                <p
                  style={{
                    color: colors.muted,
                    fontSize: "13px",
                    marginBottom: "6px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {conv.last_message || "No messages yet"}
                </p>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: colors.muted, fontSize: "11px" }}>
                    User: {conv.user_id?.substring(0, 8)}...
                  </span>
                  <span style={{ color: colors.muted, fontSize: "11px" }}>
                    {formatDate(new Date(conv.updated_at).toISOString())}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Messages - Right Panel */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          backgroundColor: colors.card,
          borderRadius: "16px",
          border: `1px solid ${colors.border}`,
          overflow: "hidden",
        }}
      >
        {!selectedConversation ? (
          /* No conversation selected */
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "32px",
            }}
          >
            <IoChatbubbleEllipsesOutline size={80} color={colors.muted} style={{ marginBottom: "16px", opacity: 0.5 }} />
            <h3 style={{ color: colors.white, fontSize: "18px", fontWeight: 600, marginBottom: "8px" }}>
              Select a conversation
            </h3>
            <p style={{ color: colors.muted, fontSize: "14px", textAlign: "center" }}>
              Choose a conversation from the list to view messages and reply
            </p>
          </div>
        ) : (
          /* Conversation selected */
          <>
            {/* Header */}
            <div
              style={{
                padding: "16px",
                background: `linear-gradient(135deg, ${colors.accent} 0%, ${colors.bg} 100%)`,
                borderBottom: `1px solid ${colors.border}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              <div>
                <h3 style={{ color: colors.white, fontSize: "16px", fontWeight: 600, marginBottom: "4px" }}>
                  {selectedConversation.store_url || "Unknown Store"}
                </h3>
                <p style={{ color: colors.white, opacity: 0.7, fontSize: "12px" }}>
                  User ID: {selectedConversation.user_id}
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                  style={{
                    backgroundColor: selectedConversation.status === "open" ? colors.success + "30" : colors.muted + "30",
                    color: selectedConversation.status === "open" ? colors.success : colors.muted,
                    padding: "4px 12px",
                    borderRadius: "12px",
                    fontSize: "12px",
                    fontWeight: 500,
                  }}
                >
                  {selectedConversation.status}
                </span>
                {selectedConversation.status === "open" && (
                  <button
                    onClick={() => closeConversation(selectedConversation.conversation_id)}
                    style={{
                      backgroundColor: "transparent",
                      border: `1px solid ${colors.white}50`,
                      borderRadius: "8px",
                      padding: "6px 12px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      color: colors.white,
                      fontSize: "12px",
                    }}
                  >
                    <IoClose size={14} />
                    Close
                  </button>
                )}
              </div>
            </div>

            {/* Messages Area */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "16px",
                backgroundColor: colors.bg,
                minHeight: 0,
              }}
              className="custom-scrollbar"
            >
              {loading ? (
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      border: `3px solid ${colors.border}`,
                      borderTopColor: colors.accent,
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite",
                    }}
                  />
                </div>
              ) : messages.length === 0 ? (
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
                  <p style={{ color: colors.muted, fontSize: "14px" }}>No messages yet</p>
                </div>
              ) : (
                <>
                  {messages.map((msg) => (
                    <div
                      key={msg.message_id}
                      style={{
                        display: "flex",
                        marginBottom: "16px",
                        justifyContent: msg.sender_type === "admin" ? "flex-end" : "flex-start",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          gap: "10px",
                          maxWidth: "70%",
                          flexDirection: msg.sender_type === "admin" ? "row-reverse" : "row",
                        }}
                      >
                        <div
                          style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "50%",
                            backgroundColor: msg.sender_type === "admin" ? colors.accent : colors.success,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <span style={{ color: colors.white, fontWeight: 600, fontSize: "14px" }}>
                            {msg.sender_type === "admin" ? "A" : "U"}
                          </span>
                        </div>
                        <div>
                          <div
                            style={{
                              backgroundColor: msg.sender_type === "admin" ? colors.accent : colors.card,
                              color: colors.white,
                              padding: "12px 16px",
                              borderRadius: msg.sender_type === "admin" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                            }}
                          >
                            <p style={{ fontSize: "14px", lineHeight: 1.5, margin: 0, whiteSpace: "pre-wrap" }}>
                              {msg.message_text}
                            </p>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              marginTop: "4px",
                              justifyContent: msg.sender_type === "admin" ? "flex-end" : "flex-start",
                            }}
                          >
                            <span style={{ color: colors.muted, fontSize: "11px" }}>
                              {formatDate(new Date(msg.created_at).toISOString())}
                            </span>
                            {msg.sender_type === "admin" && msg.is_read && (
                              <IoCheckmarkDone size={14} color={colors.success} />
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

            {/* Reply Input - ALWAYS VISIBLE */}
            <div
              style={{
                padding: "16px",
                borderTop: `1px solid ${colors.border}`,
                backgroundColor: colors.card,
                flexShrink: 0,
              }}
            >
              {selectedConversation.status === "closed" ? (
                <div
                  style={{
                    backgroundColor: colors.warning + "20",
                    border: `1px solid ${colors.warning}40`,
                    borderRadius: "12px",
                    padding: "12px 16px",
                    textAlign: "center",
                  }}
                >
                  <p style={{ color: colors.warning, fontSize: "14px", margin: 0 }}>
                    This conversation is closed. Reopen it to send messages.
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}>
                  <textarea
                    ref={textareaRef}
                    placeholder="Type your reply... (Press Enter to send, Shift+Enter for new line)"
                    value={replyMessage}
                    onChange={handleTextareaChange}
                    onKeyDown={handleKeyDown}
                    disabled={sending}
                    rows={1}
                    style={{
                      flex: 1,
                      backgroundColor: colors.inputBg,
                      color: colors.white,
                      border: `1px solid ${colors.border}`,
                      borderRadius: "12px",
                      padding: "12px 16px",
                      fontSize: "14px",
                      resize: "none",
                      outline: "none",
                      fontFamily: "inherit",
                      minHeight: "44px",
                      maxHeight: "120px",
                    }}
                  />
                  <button
                    onClick={sendReply}
                    disabled={sending || !replyMessage.trim()}
                    style={{
                      backgroundColor: sending || !replyMessage.trim() ? colors.muted : colors.accent,
                      border: "none",
                      borderRadius: "12px",
                      padding: "12px 20px",
                      cursor: sending || !replyMessage.trim() ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      color: colors.white,
                      fontWeight: 600,
                      fontSize: "14px",
                      minWidth: "100px",
                      transition: "background-color 0.2s",
                    }}
                  >
                    {sending ? (
                      <div
                        style={{
                          width: "20px",
                          height: "20px",
                          border: `2px solid ${colors.white}40`,
                          borderTopColor: colors.white,
                          borderRadius: "50%",
                          animation: "spin 1s linear infinite",
                        }}
                      />
                    ) : (
                      <>
                        <IoSend size={18} />
                        Send
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* CSS Animation */}
      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
