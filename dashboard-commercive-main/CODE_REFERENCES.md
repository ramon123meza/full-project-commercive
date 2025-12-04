# Code References & Implementation Details

## File Locations for Each Feature

### Chat System (10-second Polling, Real-time Messages)

**User Chat Interface:**
- File: `/home/user/dashboard-commercive/src/components/chat/ChatInterface.tsx`
- Lines: 1-487
- Key Functions:
  - `fetchConversations()` - Gets user's conversations (Line 88-103)
  - `fetchMessages()` - Gets messages for conversation (Line 106-122)
  - `sendMessage()` - Sends new message or creates conversation (Line 125-179)
  - `markMessagesAsRead()` - Marks conversation as read (Line 182-198)
  - `handleSelectConversation()` - Sets up 10s polling (Line 201-217)

**Admin Chat Interface:**
- File: `/home/user/dashboard-commercive/src/components/chat/AdminChatManager.tsx`
- Lines: 1-498
- Key Functions:
  - `fetchConversations()` - Gets all conversations with status filter (Line 71-96)
  - `fetchMessages()` - Gets messages for conversation (Line 99-115)
  - `sendReply()` - Admin sends reply (Line 118-152)
  - `closeConversation()` - Closes a conversation (Line 155-184)
  - `markMessagesAsRead()` - Marks as read for admin (Line 187-203)

---

## Lambda Endpoint Calls

### 1. Get User Conversations
**Source:** `ChatInterface.tsx` Line 88-103
```typescript
const fetchConversations = async () => {
  if (!userinfo?.id) return;
  
  try {
    const response = await fetch(
      `${LAMBDA_URL}?action=chat/conversations&user_id=${userinfo.id}`
    );
    const data = await response.json();
    
    if (data.conversations) {
      setConversations(data.conversations);
    }
  } catch (error) {
    console.error("Error fetching conversations:", error);
  }
};
```

**Lambda Action:** `chat/conversations`
**HTTP Method:** GET
**Parameters:**
- `action`: "chat/conversations"
- `user_id`: Supabase user ID

**Response:**
```json
{
  "conversations": [
    {
      "conversation_id": "uuid",
      "user_id": "user-id",
      "store_url": "store.myshopify.com",
      "status": "open",
      "created_at": 1732000000,
      "updated_at": 1732025476,
      "last_message": "message text",
      "unread_admin": 1,
      "unread_user": 0
    }
  ]
}
```

---

### 2. Get Messages in Conversation
**Source:** `ChatInterface.tsx` Line 106-122
```typescript
const fetchMessages = async (conversationId: string) => {
  setLoading(true);
  try {
    const response = await fetch(
      `${LAMBDA_URL}?action=chat/messages&conversation_id=${conversationId}`
    );
    const data = await response.json();
    
    if (data.messages) {
      setMessages(data.messages);
    }
  } catch (error) {
    console.error("Error fetching messages:", error);
  } finally {
    setLoading(false);
  }
};
```

**Lambda Action:** `chat/messages`
**HTTP Method:** GET
**Parameters:**
- `action`: "chat/messages"
- `conversation_id`: UUID of conversation

**Response:**
```json
{
  "messages": [
    {
      "message_id": "uuid",
      "conversation_id": "conversation-uuid",
      "sender_type": "user",
      "sender_id": "user-id",
      "message_text": "Hello",
      "created_at": 1732000001,
      "is_read": false
    }
  ]
}
```

---

### 3. Send Message (User)
**Source:** `ChatInterface.tsx` Line 125-179
```typescript
const sendMessage = async () => {
  if (!newMessage.trim() || !userinfo?.id || !selectedStore?.store_url) {
    return;
  }
  
  setSending(true);
  try {
    const response = await fetch(LAMBDA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "chat/send",
        user_id: userinfo.id,
        store_url: selectedStore.store_url,
        message: newMessage,
        conversation_id: selectedConversation?.conversation_id,
      }),
    });
    
    const data = await response.json();
    
    if (data.success) {
      setNewMessage("");
      
      // If new conversation
      if (!selectedConversation) {
        const newConv: Conversation = {
          conversation_id: data.conversation_id,
          user_id: userinfo.id,
          store_url: selectedStore.store_url,
          status: "open",
          created_at: Date.now(),
          updated_at: Date.now(),
          last_message: newMessage,
          unread_admin: 1,
          unread_user: 0,
        };
        setSelectedConversation(newConv);
        setConversations([newConv, ...conversations]);
      }
      
      // Refresh messages and conversations
      if (selectedConversation || data.conversation_id) {
        await fetchMessages(selectedConversation?.conversation_id || data.conversation_id);
      }
      await fetchConversations();
    }
  } catch (error) {
    console.error("Error sending message:", error);
  } finally {
    setSending(false);
  }
};
```

**Lambda Action:** `chat/send`
**HTTP Method:** POST
**Request Body:**
```json
{
  "action": "chat/send",
  "user_id": "supabase-user-id",
  "store_url": "mystore.myshopify.com",
  "message": "Hello, I need help",
  "conversation_id": "uuid or null"
}
```

**Response:**
```json
{
  "success": true,
  "conversation_id": "generated-uuid",
  "message_id": "generated-uuid"
}
```

---

### 4. Admin Get Conversations
**Source:** `AdminChatManager.tsx` Line 71-96
```typescript
const fetchConversations = async () => {
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
    
    if (data.conversations) {
      setConversations(data.conversations);
    }
  } catch (error) {
    console.error("Error fetching conversations:", error);
    setConversations([]);
  }
};
```

**Lambda Action:** `admin/conversations`
**HTTP Method:** GET
**Parameters:**
- `action`: "admin/conversations"
- `status`: "open" | "closed" | (omitted for all)
- `limit`: 100

---

### 5. Mark Messages as Read
**Source:** `ChatInterface.tsx` Line 182-198
```typescript
const markMessagesAsRead = async (conversationId: string) => {
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
    // Refresh conversations to update unread count
    fetchConversations();
  } catch (error) {
    console.error("Error marking messages as read:", error);
  }
};
```

**Lambda Action:** `chat/mark-read`
**HTTP Method:** POST
**Request Body:**
```json
{
  "action": "chat/mark-read",
  "conversation_id": "conversation-uuid",
  "reader_type": "user" or "admin"
}
```

---

## Affiliate System

### File: Affiliate Form (Public Landing Page)
- File: `/home/user/dashboard-commercive/src/app/(public)/affiliate-form/page.tsx`
- Lines: 1-311
- Purpose: Accepts lead submissions from affiliate referral links

**Key Implementation (Lines 55-89):**
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!refCode) {
    setError("Invalid referral link. Please use a valid affiliate link.");
    return;
  }
  
  setSubmitting(true);
  setError("");
  
  try {
    const response = await fetch(LAMBDA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "affiliate/submit-lead",
        link_id: refCode,
        lead_data: formData,
      }),
    });
    
    const data = await response.json();
    
    if (data.success) {
      setSubmitted(true);
    } else {
      setError(data.error || "Failed to submit. Please try again.");
    }
  } catch (err) {
    setError("Network error. Please check your connection and try again.");
    console.error("Error submitting lead:", err);
  } finally {
    setSubmitting(false);
  }
};
```

**Lambda Action:** `affiliate/submit-lead`
**Request Body:**
```json
{
  "action": "affiliate/submit-lead",
  "link_id": "ABC123XYZ",
  "lead_data": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "product_link": "https://aliexpress.com/...",
    "order_volume": "1-5",
    "pending_orders": "10"
  }
}
```

---

### File: Affiliate Dashboard
- File: `/home/user/dashboard-commercive/src/app/(authentificated)/commercive-partners/page.tsx`
- Lines: 1-1214
- Key Functions:
  - `generateAffiliateLink()` (Line 145-195)
  - `fetchLambdaStats()` (Line 198-231)

**Generate Affiliate Link (Lines 145-195):**
```typescript
const generateAffiliateLink = async () => {
  if (!IS_LAMBDA_ENABLED) {
    console.log("Lambda not configured, using Supabase-only mode");
    return;
  }
  
  if (!userinfo?.id || !selectedStore?.store_url) return;
  
  try {
    // First check if link already exists
    const checkResponse = await fetch(
      `${LAMBDA_URL}?action=affiliate/get-link&affiliate_id=${userinfo.id}`
    );
    const checkData = await checkResponse.json();
    
    if (checkData.affiliate_link) {
      setLambdaAffiliateLink(checkData.affiliate_link.affiliate_url);
      console.log("Existing affiliate link loaded:", checkData.affiliate_link.affiliate_url);
    } else {
      // Create new link
      const createResponse = await fetch(LAMBDA_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "affiliate/create-link",
          affiliate_id: userinfo.id,
          affiliate_email: userinfo.email,
          store_url: selectedStore.store_url,
        }),
      });
      const createData = await createResponse.json();
      
      if (createData.success) {
        setLambdaAffiliateLink(createData.affiliate_url);
        console.log("New affiliate link created:", createData.affiliate_url);
        
        // Update Supabase for backward compatibility
        await supabase
          .from("affiliate")
          .update({
            form_url: createData.affiliate_url,
            link_id: createData.link_id,
          })
          .eq("affiliate_id", userinfo.id);
      }
    }
  } catch (error) {
    console.error("Error generating affiliate link:", error);
  }
};
```

**Fetch Affiliate Stats (Lines 198-231):**
```typescript
const fetchLambdaStats = async () => {
  if (!IS_LAMBDA_ENABLED) {
    return;
  }
  
  if (!userinfo?.id) return;
  
  try {
    const response = await fetch(
      `${LAMBDA_URL}?action=affiliate/stats&affiliate_id=${userinfo.id}`
    );
    const data = await response.json();
    
    if (data.stats) {
      setLambdaStats(data.stats);
      
      // Update chart data with Lambda stats
      setChartData((prevData) =>
        prevData.map((item) => {
          if (item.name === "Total Referrals") {
            return {
              ...item,
              amount: data.stats.total_leads.toString(),
            };
          }
          return item;
        })
      );
    }
  } catch (error) {
    console.error("Error fetching Lambda stats:", error);
  }
};
```

**Lambda Actions:**
1. `affiliate/get-link` - Get existing link
2. `affiliate/create-link` - Create new link
3. `affiliate/stats` - Get affiliate statistics

---

### File: Admin Leads Dashboard
- File: `/home/user/dashboard-commercive/src/app/(authentificated)/admin/leads/page.tsx`
- Lines: 1-504
- Key Functions:
  - `fetchLeads()` (Line 60-77)
  - `handleApproveReject()` (Line 90-122)

**Fetch Leads (Lines 60-77):**
```typescript
const fetchLeads = async () => {
  if (!LAMBDA_URL) return;
  
  setLoading(true);
  try {
    const url = `${LAMBDA_URL}?action=admin/leads&status=${statusFilter}&limit=100`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.leads) {
      setLeads(data.leads);
    }
  } catch (error) {
    console.error("Error fetching leads:", error);
  } finally {
    setLoading(false);
  }
};
```

**Approve/Reject Lead (Lines 90-122):**
```typescript
const handleApproveReject = async (action: "approve" | "reject") => {
  if (!selectedLead || !LAMBDA_URL) return;
  
  setProcessing(true);
  try {
    const response = await fetch(LAMBDA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "admin/approve-lead",
        lead_id: selectedLead.lead_id,
        action: action,
        commission_amount:
          action === "approve" ? parseFloat(commissionAmount) || 0 : 0,
        admin_notes: adminNotes,
      }),
    });
    
    const data = await response.json();
    
    if (data.success) {
      setApprovalDialogOpen(false);
      setDetailsOpen(false);
      setCommissionAmount("");
      setAdminNotes("");
      fetchLeads(); // Refresh list
    }
  } catch (error) {
    console.error("Error approving/rejecting lead:", error);
  } finally {
    setProcessing(false);
  }
};
```

**Lambda Actions:**
1. `admin/leads` - Get leads with status filter
2. `admin/approve-lead` - Approve or reject a lead

---

## Type Definitions

### Chat Types
**Source:** `ChatInterface.tsx` Lines 21-41
```typescript
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
```

### Lead Type
**Source:** `admin/leads/page.tsx` Lines 30-45
```typescript
interface Lead {
  lead_id: string;
  affiliate_id: string;
  link_id: string;
  status: "pending" | "approved" | "rejected";
  lead_name: string;
  lead_email: string;
  lead_phone: string;
  product_link: string;
  order_volume: string;
  pending_orders: string;
  created_at: number;
  updated_at: number;
  commission_amount?: number;
  admin_notes?: string;
}
```

---

## Polling Configuration

### Chat Polling
**Source:** `ChatInterface.tsx` Line 19
```typescript
const POLL_INTERVAL = 10000; // 10 seconds
```

**Implementation:** `ChatInterface.tsx` Lines 210-217
```typescript
// Start polling for new messages
if (pollIntervalRef.current) {
  clearInterval(pollIntervalRef.current);
}
pollIntervalRef.current = setInterval(() => {
  fetchMessages(conversation.conversation_id);
}, POLL_INTERVAL);
```

**Cleanup:** `ChatInterface.tsx` Lines 233-238
```typescript
return () => {
  if (pollIntervalRef.current) {
    clearInterval(pollIntervalRef.current);
  }
};
```

### Periodic Refresh
**Conversations:** Every 10 seconds (Line 241-244)
```typescript
const interval = setInterval(fetchConversations, POLL_INTERVAL);
return () => clearInterval(interval);
```

**Admin Leads:** Every 30 seconds (Line 84-87)
```typescript
const interval = setInterval(fetchLeads, 30000);
return () => clearInterval(interval);
```

**Affiliate Stats:** Every 30 seconds (Line 723-729)
```typescript
if (IS_LAMBDA_ENABLED && userinfo?.id) {
  fetchLambdaStats();
  const interval = setInterval(fetchLambdaStats, 30000);
  return () => clearInterval(interval);
}
```

---

## Environment Configuration

### Lambda URL
**Location:** All files using Lambda
```typescript
const LAMBDA_URL = process.env.NEXT_PUBLIC_AWS_LAMBDA_URL || "";
```

**Files:**
- `src/components/chat/ChatInterface.tsx` - Line 18
- `src/components/chat/AdminChatManager.tsx` - Line 24
- `src/app/(public)/affiliate-form/page.tsx` - Line 20
- `src/app/(authentificated)/admin/leads/page.tsx` - Line 28
- `src/app/(authentificated)/commercive-partners/page.tsx` - Line 58

### Lambda Enabled Check
**Source:** `commercive-partners/page.tsx` Lines 58-59
```typescript
const LAMBDA_URL = process.env.NEXT_PUBLIC_AWS_LAMBDA_URL || "";
const IS_LAMBDA_ENABLED = LAMBDA_URL && LAMBDA_URL.startsWith("https://");
```

### Fallback Behavior
**Source:** `commercive-partners/page.tsx` Lines 147-150
```typescript
if (!IS_LAMBDA_ENABLED) {
  console.log("Lambda not configured, using Supabase-only mode for affiliates");
  return;
}
```

---

## API Response Validation

### Example Error Handling
**Source:** `ChatInterface.tsx` Lines 145-173
```typescript
const data = await response.json();

if (data.success) {
  setNewMessage("");
  
  // Update UI
  if (!selectedConversation) {
    // Handle new conversation
  }
  
  // Refresh data
  await fetchMessages(conversationId);
  await fetchConversations();
} else {
  // Error already handled
}
```

### Example in Leads
**Source:** `admin/leads/page.tsx` Lines 108-116
```typescript
const data = await response.json();

if (data.success) {
  setApprovalDialogOpen(false);
  setDetailsOpen(false);
  fetchLeads(); // Refresh
}
```

---

## Performance Optimizations

### useRef for Polling
**Purpose:** Prevent multiple intervals from stacking
**Source:** `ChatInterface.tsx` Lines 52, 214-216
```typescript
const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

// Clear old interval before creating new one
if (pollIntervalRef.current) {
  clearInterval(pollIntervalRef.current);
}
pollIntervalRef.current = setInterval(() => {
  fetchMessages(conversation.conversation_id);
}, POLL_INTERVAL);
```

### Conditional Rendering
**Purpose:** Avoid unnecessary API calls
**Source:** `commercive-partners/page.tsx` Lines 147-150
```typescript
if (!IS_LAMBDA_ENABLED) {
  console.log("Lambda not configured");
  return;
}
```

---

## Summary Statistics

| Metric | Value |
|--------|-------|
| Total DynamoDB Tables | 4 |
| Total Lambda Actions | 13 |
| Chat Polling Interval | 10 seconds |
| Admin Refresh Interval | 30 seconds |
| Lead Query Limit | 100 items |
| Files with Lambda Calls | 5 |
| Type Definitions | 2 main (Message, Conversation, Lead) |

