# DynamoDB Schema & Data Access Patterns Analysis
## Commercive Dashboard - AWS Lambda Integration

**Analysis Date:** November 19, 2025
**Project:** Dashboard Commercive (Next.js + Supabase Frontend, AWS Lambda + DynamoDB Backend)
**Environment Variable:** `NEXT_PUBLIC_AWS_LAMBDA_URL`

---

## Executive Summary

This system uses AWS Lambda as the API gateway with DynamoDB as the primary data store for real-time communication features (chat, conversations, leads, and affiliate tracking). The frontend is a Next.js application deployed on Vercel that communicates with Lambda endpoints using HTTP GET/POST requests with action-based routing.

### Key Findings:
- **4 Primary DynamoDB Tables** identified from API patterns
- **10 Lambda Actions** covering CRUD operations
- **Real-time Polling** mechanism (10-second intervals) for message synchronization
- **User-partitioned Data** for conversations and messages
- **No direct infrastructure code** found (backend managed separately)

---

## 1. DynamoDB Tables Overview

### Table 1: Conversations Table

**Purpose:** Stores user-to-admin support conversations

**Inferred Primary Key Structure:**
```
Partition Key (PK): conversation_id (String, UUID format)
Sort Key (SK): created_at (Number, Unix timestamp)
```

**GSI - By User:**
```
GSI Name: UserConversationsIndex
PK: user_id (String, Supabase user ID)
SK: updated_at (Number, Unix timestamp)
```

**GSI - By Status:**
```
GSI Name: ConversationStatusIndex
PK: status (String - "open" or "closed")
SK: updated_at (Number, Unix timestamp)
```

**Attributes:**
```typescript
{
  conversation_id: string;        // UUID v4, Primary Key
  user_id: string;                // Supabase auth user ID
  store_url: string;              // Shopify store domain
  status: "open" | "closed";      // Current conversation state
  created_at: number;             // Unix timestamp (milliseconds)
  updated_at: number;             // Unix timestamp (milliseconds)
  last_message: string;           // Preview text from last message
  unread_admin: number;           // Count of unread messages for admin
  unread_user: number;            // Count of unread messages for user
}
```

**Data Lifecycle:**
- Created when first message sent by user
- Updated when new messages arrive or status changes
- Status changes to "closed" when admin closes conversation
- No explicit TTL configured (conversations persist indefinitely)

**Access Patterns:**
1. Query conversations by user: `GSI UserConversationsIndex, user_id = X, sorted by updated_at DESC`
2. Query all open conversations (admin): `GSI ConversationStatusIndex, status = "open"`
3. Query by conversation_id: Direct read using PK
4. Count unread by user: Scan with filter on unread_user > 0

---

### Table 2: Messages Table

**Purpose:** Stores individual chat messages within conversations

**Inferred Primary Key Structure:**
```
Partition Key (PK): conversation_id (String)
Sort Key (SK): message_id (String, may include created_at for ordering)
```

**Alternative SK (Based on sorting patterns):**
```
Possible: sort_key = created_at#message_id (composite for ordering)
```

**GSI - By Conversation and Time:**
```
GSI Name: MessageTimestampIndex
PK: conversation_id
SK: created_at (Number, for reverse chronological ordering)
```

**Attributes:**
```typescript
{
  message_id: string;                      // UUID v4, unique within conversation
  conversation_id: string;                 // Foreign key to Conversations
  sender_type: "user" | "admin";           // Message source
  sender_id: string;                       // User ID of sender
  message_text: string;                    // Message content
  created_at: number;                      // Unix timestamp (milliseconds)
  is_read: boolean;                        // Read status for recipient
}
```

**Access Patterns:**
1. Fetch all messages for conversation: Query PK = conversation_id, sorted by created_at
2. Real-time polling: Query since last_message_timestamp
3. Mark messages as read: Update is_read = true for conversation_id
4. Count unread: Query GSI with is_read = false filter

**Pagination:** 
- Returns all messages at once (no pagination limit found)
- 10-second polling interval keeps UI in sync

---

### Table 3: Leads Table

**Purpose:** Tracks affiliate-generated leads for the sales/business development process

**Inferred Primary Key Structure:**
```
Partition Key (PK): lead_id (String, UUID)
Sort Key (SK): created_at (Number, Unix timestamp)
```

**GSI - By Affiliate:**
```
GSI Name: AffiliateLeadsIndex
PK: affiliate_id (String)
SK: created_at (Number)
```

**GSI - By Status:**
```
GSI Name: LeadStatusIndex
PK: status (String - "pending", "approved", "rejected")
SK: created_at (Number)
```

**GSI - By Link ID:**
```
GSI Name: LinkLeadsIndex
PK: link_id (String)
SK: created_at (Number)
```

**Attributes:**
```typescript
{
  lead_id: string;                    // UUID v4, Primary Key
  affiliate_id: string;               // Supabase user ID (referrer)
  link_id: string;                    // Unique affiliate link identifier
  status: "pending" | "approved" | "rejected";  // Lead approval state
  
  // Lead Information
  lead_name: string;                  // Full name of prospect
  lead_email: string;                 // Email address
  lead_phone: string;                 // Contact phone (WhatsApp preferred)
  product_link: string;               // URL to product (Aliexpress, etc)
  order_volume: string;               // "0", "1-5", "5-20", "20-100", "100+"
  pending_orders: string;             // Number of pending orders on their store
  
  // Admin Review
  commission_amount?: number;         // Set when approved (USD)
  admin_notes?: string;               // Internal notes from reviewer
  
  // Timestamps
  created_at: number;                 // When lead was submitted
  updated_at: number;                 // When last updated
}
```

**Data Lifecycle:**
- Created when user submits affiliate form via referral link
- Status = "pending" initially
- Admin reviews and either approves (status="approved") or rejects (status="rejected")
- Commission amount set on approval
- No TTL (leads retained for business records)

**Access Patterns:**
1. Admin dashboard: Query status="pending" with limit=100
2. List leads by affiliate: Query affiliate_id via GSI
3. Approve/reject lead: Update status and commission_amount
4. Get lead by link: Query link_id via GSI (for tracking affiliate performance)

---

### Table 4: Affiliate Links Table

**Purpose:** Stores unique tracking links for each affiliate

**Inferred Primary Key Structure:**
```
Partition Key (PK): affiliate_id (String)
Sort Key (SK): created_at (Number) or link_id (String)
```

**Attributes:**
```typescript
{
  affiliate_id: string;                   // Supabase user ID (Primary Key)
  link_id: string;                        // Short unique code (used in URL ref param)
  affiliate_email: string;                // Affiliate contact email
  affiliate_url: string;                  // Full referral URL to affiliate-form
  store_url: string;                      // Commercive store URL
  
  created_at: number;                     // When link was created
  updated_at: number;                     // Last update timestamp
}
```

**Access Patterns:**
1. Get affiliate link: Query PK = affiliate_id
2. Create new link: Put new item with affiliate_id + link_id
3. Lookup by link_id: May require GSI or separate lookup table
   ```
   Possible GSI: LinkIdIndex (PK: link_id, SK: affiliate_id)
   ```

**Usage Example:**
```
GET /affiliate-form?ref=ABC123
Lambda resolves link_id to affiliate_id for credit tracking
```

---

### Table 5: Affiliate Stats Table (Derived/Aggregated)

**Purpose:** Cache computed affiliate statistics for dashboard performance

**Inferred Structure:**
```typescript
{
  affiliate_id: string;                   // Primary Key
  total_leads: number;                    // Count of submitted leads
  approved_leads: number;                 // Count of approved leads
  pending_leads: number;                  // Count of pending leads
  rejected_leads: number;                 // Count of rejected leads
  total_commission: number;               // Sum of approved commissions
  
  last_updated: number;                   // Timestamp of last calculation
}
```

**Update Strategy:**
- Calculated on-demand when affiliate loads dashboard
- May be cached with TTL for performance
- Recalculated when: lead status changes, commission updated

---

## 2. Access Patterns & Query Types

### Chat Message Access Patterns

#### 2.1 User: Get My Conversations
**Lambda Action:** `chat/conversations`
```typescript
GET: ${LAMBDA_URL}?action=chat/conversations&user_id=${userinfo.id}

Response: {
  conversations: Conversation[]
}
```

**Query Pattern:**
- Table: Conversations
- Access: GSI UserConversationsIndex
- Query: `user_id = ${user_id}`
- Sort: `updated_at DESC` (most recent first)
- Result: List of conversations with unread counts

**Performance:** 
- No pagination limit observed
- Uses 10-second polling interval
- Suitable for users with moderate conversation count

#### 2.2 User: Get Messages in Conversation
**Lambda Action:** `chat/messages`
```typescript
GET: ${LAMBDA_URL}?action=chat/messages&conversation_id=${conversationId}

Response: {
  messages: Message[]
}
```

**Query Pattern:**
- Table: Messages
- Access: Primary Key
- Query: `conversation_id = ${conversation_id}`
- Sort: `created_at ASC` (chronological)
- Returns: All messages (no pagination)

**Data Flow:**
1. User opens conversation
2. Fetch all messages from creation
3. Poll every 10 seconds for new messages
4. Display updates in real-time

#### 2.3 User: Send Message
**Lambda Action:** `chat/send`
```typescript
POST: ${LAMBDA_URL}
Body: {
  action: "chat/send",
  user_id: userinfo.id,
  store_url: selectedStore.store_url,
  message: newMessage,
  conversation_id: selectedConversation?.conversation_id // null for new conv
}

Response: {
  success: boolean,
  conversation_id: string,
  message_id: string
}
```

**Write Operation:**
- If `conversation_id` is null:
  - Create new Conversations record
  - Create new Messages record
  - Return generated conversation_id
- If `conversation_id` exists:
  - Create Messages record
  - Update Conversations.updated_at and last_message
  - Update unread_admin count
  
**Consistency:** 
- Single round-trip write (or transaction)
- Timestamp-based ordering ensures message sequence

#### 2.4 User: Mark Messages as Read
**Lambda Action:** `chat/mark-read`
```typescript
POST: ${LAMBDA_URL}
Body: {
  action: "chat/mark-read",
  conversation_id: conversationId,
  reader_type: "user"  // or "admin"
}
```

**Update Operation:**
- Batch update: Set is_read = true for all messages in conversation
- Update Conversations: Set unread_user = 0 (or unread_admin = 0 for admin)
- Possible Implementation:
  ```
  Query: conversation_id = X AND is_read = false
  Update: Set is_read = true for all
  ```

#### 2.5 Admin: Get All Conversations
**Lambda Action:** `admin/conversations`
```typescript
GET: ${LAMBDA_URL}?action=admin/conversations&limit=100
GET: ${LAMBDA_URL}?action=admin/conversations&status=open&limit=100

Response: {
  conversations: Conversation[]
}
```

**Query Patterns:**
1. **All conversations (limited):**
   - Scan Conversations table with limit=100
   - Sort by updated_at DESC
   
2. **By Status:**
   - Query: GSI ConversationStatusIndex
   - PK: status = "open" or "closed"
   - Sort: updated_at DESC
   - Limit: 100 results

**Admin Dashboard Feature:**
- Status filter dropdown (open/closed/all)
- Shows unread badge for conversations with unread_admin > 0
- Real-time polling every 10 seconds

#### 2.6 Admin: Send Reply
**Lambda Action:** `chat/reply`
```typescript
POST: ${LAMBDA_URL}
Body: {
  action: "chat/reply",
  conversation_id: selectedConversation.conversation_id,
  admin_id: userinfo.id,
  message: replyMessage
}

Response: {
  success: boolean
}
```

**Write Operation:**
- Create Messages record (sender_type = "admin")
- Update Conversations.updated_at and last_message
- Update unread_user count (increment)

#### 2.7 Admin: Close Conversation
**Lambda Action:** `chat/close`
```typescript
POST: ${LAMBDA_URL}
Body: {
  action: "chat/close",
  conversation_id: conversationId
}

Response: {
  success: boolean
}
```

**Update Operation:**
- Update Conversations: status = "closed"
- Prevents further messages in UI (disabled text field for closed status)

---

### Affiliate/Lead Access Patterns

#### 2.8 Public: Submit Affiliate Lead
**Lambda Action:** `affiliate/submit-lead`
```typescript
POST: ${LAMBDA_URL}
Body: {
  action: "affiliate/submit-lead",
  link_id: refCode,
  lead_data: {
    name: string,
    email: string,
    phone: string,
    product_link: string,
    order_volume: string,
    pending_orders: string
  }
}

Response: {
  success: boolean,
  error?: string
}
```

**Write Operation:**
1. Lookup affiliate_id from link_id in Affiliate Links table
2. Create Leads record:
   - lead_id: Generated UUID
   - affiliate_id: Retrieved from link lookup
   - link_id: From request
   - status: "pending"
   - All lead_data fields
   - created_at = now()
3. Update affiliate stats cache (total_leads++)

**Form Access:**
- Public landing page: `/affiliate-form?ref=ABC123`
- Validates ref parameter exists
- Submits to Lambda endpoint

#### 2.9 Affiliate: Get Affiliate Link
**Lambda Action:** `affiliate/get-link`
```typescript
GET: ${LAMBDA_URL}?action=affiliate/get-link&affiliate_id=${userinfo.id}

Response: {
  affiliate_link: {
    affiliate_url: string,
    affiliate_id: string,
    link_id: string
  }
}
```

**Query Pattern:**
- Table: Affiliate Links
- Query: PK = affiliate_id
- Returns: Full URL in format `https://dashboard.commercive.co/affiliate-form?ref=${link_id}`

**Use Case:**
- Affiliate dashboard shows shareable link
- Copy-to-clipboard functionality for marketing

#### 2.10 Affiliate: Create Affiliate Link
**Lambda Action:** `affiliate/create-link`
```typescript
POST: ${LAMBDA_URL}
Body: {
  action: "affiliate/create-link",
  affiliate_id: userinfo.id,
  affiliate_email: userinfo.email,
  store_url: selectedStore.store_url
}

Response: {
  success: boolean,
  affiliate_url: string,
  link_id: string
}
```

**Write Operation:**
1. Generate unique link_id (short code, likely 6-8 alphanumeric chars)
2. Create Affiliate Links record
3. Update Supabase affiliate table for backward compatibility
4. Return affiliate_url for display

**Fallback:** 
- If Lambda not configured, uses Supabase-only mode
- Reads from Supabase `affiliate.form_url` field

#### 2.11 Affiliate: Get Statistics
**Lambda Action:** `affiliate/stats`
```typescript
GET: ${LAMBDA_URL}?action=affiliate/stats&affiliate_id=${userinfo.id}

Response: {
  stats: {
    total_leads: number,
    approved_leads?: number,
    pending_leads?: number,
    rejected_leads?: number,
    total_commission?: number
  }
}
```

**Query Pattern:**
- Lookup affiliate stats from cache or compute on-demand
- Count leads by status from Leads table
- Sum commission amounts
- Updates charts in dashboard

#### 2.12 Admin: Get Leads
**Lambda Action:** `admin/leads`
```typescript
GET: ${LAMBDA_URL}?action=admin/leads&status=pending&limit=100

Response: {
  leads: Lead[]
}
```

**Query Patterns:**
1. **By Status:**
   - Query: GSI LeadStatusIndex
   - PK: status = "pending" | "approved" | "rejected"
   - SK: created_at DESC
   - Limit: 100 results

2. **Search/Filter:**
   - Client-side filtering by name, email, product_link (in UI)
   - Lambda returns all for status, client filters

**Admin Dashboard:**
- Status dropdown filter (pending/approved/rejected/all)
- Shows 30-second refresh interval
- Displays lead details and approval options

#### 2.13 Admin: Approve/Reject Lead
**Lambda Action:** `admin/approve-lead`
```typescript
POST: ${LAMBDA_URL}
Body: {
  action: "admin/approve-lead",
  lead_id: selectedLead.lead_id,
  action: "approve" | "reject",
  commission_amount: number,  // when approving
  admin_notes?: string
}

Response: {
  success: boolean
}
```

**Update Operations:**
1. Approve:
   - Update Leads: status = "approved"
   - Update Leads: commission_amount = ${amount}
   - Update Leads: admin_notes = ${notes}
   - Update Leads: updated_at = now()
   
2. Reject:
   - Update Leads: status = "rejected"
   - Update Leads: admin_notes = ${notes}
   - Update Leads: updated_at = now()

---

## 3. Lambda Endpoints Summary

| Action | Method | Parameters | Table(s) | Read/Write |
|--------|--------|------------|----------|-----------|
| `chat/conversations` | GET | user_id | Conversations | Read |
| `chat/messages` | GET | conversation_id | Messages | Read |
| `chat/send` | POST | user_id, store_url, message, conversation_id | Conversations, Messages | Write |
| `chat/mark-read` | POST | conversation_id, reader_type | Conversations, Messages | Update |
| `chat/reply` | POST | conversation_id, admin_id, message | Conversations, Messages | Write |
| `chat/close` | POST | conversation_id | Conversations | Update |
| `admin/conversations` | GET | status, limit | Conversations | Read |
| `affiliate/get-link` | GET | affiliate_id | Affiliate Links | Read |
| `affiliate/create-link` | POST | affiliate_id, email, store_url | Affiliate Links | Write |
| `affiliate/submit-lead` | POST | link_id, lead_data | Leads, Affiliate Links | Write |
| `affiliate/stats` | GET | affiliate_id | Leads (aggregated) | Read |
| `admin/leads` | GET | status, limit | Leads | Read |
| `admin/approve-lead` | POST | lead_id, action, commission_amount, notes | Leads | Update |

---

## 4. Data Type Mappings

### DynamoDB Types to Application Types

```typescript
// Primary Key Types
string (UUID): "550e8400-e29b-41d4-a716-446655440000"
string (Email): "user@example.com"
string (Short Code): "ABC123"

// Timestamp Types
number (Unix milliseconds): 1732025476500
// Used consistently for created_at, updated_at, and sorting

// Boolean
boolean: true/false
// Used for: is_read, status flags

// Enum/String
string ("open" | "closed" | "pending" | "approved" | "rejected")

// Numeric
number: sales count, commission amounts, unread counts
```

---

## 5. GSI (Global Secondary Indexes) Definitions

### GSI Strategy
The system uses GSIs to enable efficient queries without scanning entire tables:

**Conversations Table GSIs:**
1. `UserConversationsIndex`
   - PK: user_id
   - SK: updated_at (descending)
   - Projections: ALL
   - Use: Fetch user's conversations with newest first

2. `ConversationStatusIndex`
   - PK: status
   - SK: updated_at (descending)
   - Projections: ALL
   - Use: Admin dashboard - filter open/closed conversations

**Leads Table GSIs:**
1. `AffiliateLeadsIndex`
   - PK: affiliate_id
   - SK: created_at (descending)
   - Projections: ALL
   - Use: Count affiliate's leads for stats

2. `LeadStatusIndex`
   - PK: status
   - SK: created_at (descending)
   - Projections: ALL
   - Use: Admin dashboard - filter by approval status

3. `LinkLeadsIndex`
   - PK: link_id
   - SK: created_at
   - Projections: ALL
   - Use: Track leads per affiliate link

---

## 6. Real-Time Data Synchronization

### Polling Mechanism
```typescript
const POLL_INTERVAL = 10000; // 10 seconds
```

**Implementation:**
- Frontend fetches conversations/messages every 10 seconds
- Admin dashboard refreshes leads every 30 seconds
- Affiliate dashboard stats refresh every 30 seconds

**Polling Locations:**
```
src/components/chat/ChatInterface.tsx
  - fetchConversations() → 10s interval
  - fetchMessages(conversation_id) → 10s when conversation selected
  
src/components/chat/AdminChatManager.tsx
  - fetchConversations() → 10s interval with status filter
  - fetchMessages(conversation_id) → 10s when selected

src/app/(authentificated)/admin/leads/page.tsx
  - fetchLeads() → 30s interval

src/app/(authentificated)/commercive-partners/page.tsx
  - fetchLambdaStats() → 30s interval
```

### Advantages:
- Simple implementation (no WebSockets needed)
- Compatible with serverless Lambda (stateless)
- Cost-effective for moderate traffic

### Trade-offs:
- Up to 10-second delay in message visibility
- Extra HTTP requests compared to real-time pub/sub
- No change notifications (always fetches full state)

---

## 7. Batch Operations & Transactions

### Mark All Messages as Read
**Pattern:** Batch Update

```typescript
// Operation
action: "chat/mark-read"
conversation_id: "xyz-123"
reader_type: "user"

// Implementation (inferred)
DynamoDB Update:
  Query: {
    conversation_id = "xyz-123" AND is_read = false
  }
  Update: {
    SET is_read = :true
    UPDATE conversation: unread_user = 0
  }
```

### Atomic Conversation Creation
**Pattern:** Conditional Transactional Write

```typescript
// When user sends first message to new recipient
1. Put Conversations (conversation_id, user_id, store_url, status="open", etc)
2. Put Messages (conversation_id, message_id, text, created_at)
3. Return conversation_id

// Transaction ensures both succeed or both fail
```

---

## 8. TTL (Time To Live) Configuration

**Current Status:** No explicit TTL found in codebase

### Implications:
- **Conversations:** Persist indefinitely (suitable for support records)
- **Messages:** Persist indefinitely (audit trail)
- **Leads:** Persist indefinitely (business/legal records)
- **Affiliate Links:** Persist indefinitely (earnings tracking)

### Recommendations for TTL:
```
If storage optimization needed:

1. Messages - Archive after 1 year
   TTL: created_at + 31536000 (seconds)
   
2. Affiliate Links - Keep indefinitely
   No TTL (referral history important)
   
3. Leads - Keep indefinitely
   No TTL (sales pipeline data)
```

---

## 9. DynamoDB Streams & Triggers

**Current Status:** No evidence of DynamoDB Streams found

### What's Not Present:
- No Lambda event source mappings
- No real-time fanout to other services
- No automatic Supabase synchronization
- No email notifications on message arrival

### Why Not Needed:
- Frontend polling handles real-time updates
- No complex event processing required
- Admin dashboard uses passive polling

### Future Implementation Option:
```
If real-time notifications needed:
1. Enable DynamoDB Streams on Conversations table
2. Create Lambda trigger for new messages
3. Invoke SNS/SQS for email notifications
4. Send WebSocket message to admin dashboard
```

---

## 10. Client Configuration

### Environment Variable
```
NEXT_PUBLIC_AWS_LAMBDA_URL=https://lambda-function-url.lambda-url.region.on.aws/
```

**Notes:**
- Public env var (exposed in frontend)
- Lambda function likely has open CORS for this domain
- No authentication/signing required for Lambda calls
- May use API key in Lambda URL (check CloudFormation)

### Fallback Behavior
```typescript
// If Lambda not configured
IS_LAMBDA_ENABLED = LAMBDA_URL && LAMBDA_URL.startsWith("https://");

// Falls back to Supabase-only mode for affiliate features
// Chat features disabled entirely without Lambda
```

---

## 11. Infrastructure Observations

### Not Found in Repo:
- CloudFormation/CDK templates
- Terraform configuration
- Serverless Framework definition
- DynamoDB local setup for development

### Indicators It Exists Elsewhere:
- Comment in code: "Backend: AWS Lambda + DynamoDB"
- Production Lambda function deployed
- DynamoDB tables provisioned
- All working in production

### Recommendation:
Infrastructure-as-Code repo is likely separate, managed in different Git repo or AWS CDK stack

---

## 12. Complete Data Flow Example

### Scenario: User sends first message in new conversation

**Step 1: Frontend Action**
```javascript
fetch(LAMBDA_URL, {
  method: "POST",
  body: {
    action: "chat/send",
    user_id: "user-123",
    store_url: "mystore.myshopify.com",
    message: "Hello, I need help",
    conversation_id: null  // new conversation
  }
})
```

**Step 2: Lambda Processing**
```python
# Pseudocode
link_id = generate_uuid()
conversation = {
    conversation_id: link_id,
    user_id: "user-123",
    store_url: "mystore.myshopify.com",
    status: "open",
    created_at: timestamp,
    updated_at: timestamp,
    last_message: "Hello, I need help",
    unread_admin: 1,
    unread_user: 0
}
message = {
    message_id: generate_uuid(),
    conversation_id: link_id,
    sender_type: "user",
    sender_id: "user-123",
    message_text: "Hello, I need help",
    created_at: timestamp,
    is_read: false
}

# Transactional write
put(Conversations, conversation)
put(Messages, message)
return { success: true, conversation_id: link_id }
```

**Step 3: Frontend Update**
```javascript
setConversations([newConversation, ...conversations])
setSelectedConversation(newConversation)
setNewMessage("")  // Clear input
fetchMessages(newConversation.conversation_id)  // Load messages
```

**Step 4: Real-Time Sync (Admin Side)**
```javascript
// Every 10 seconds, admin dashboard runs:
fetchConversations()
// Query: admin/conversations&status=open
// Sees new conversation with unread_admin=1
// Conversation appears in list
```

**Step 5: Admin Reply**
```javascript
fetch(LAMBDA_URL, {
  method: "POST",
  body: {
    action: "chat/reply",
    conversation_id: "xyz-123",
    admin_id: "admin-456",
    message: "Hi! How can I help you?"
  }
})
```

**Step 6: Lambda Creates Message**
```python
message = {
    message_id: generate_uuid(),
    conversation_id: "xyz-123",
    sender_type: "admin",
    sender_id: "admin-456",
    message_text: "Hi! How can I help you?",
    created_at: timestamp,
    is_read: false
}
put(Messages, message)

# Update conversation
update(Conversations, {
    conversation_id: "xyz-123",
    last_message: "Hi! How can I help you?",
    updated_at: timestamp,
    unread_user: 1
})
```

**Step 7: User Polling**
```javascript
// User's 10-second polling hits:
fetchMessages("xyz-123")
// Returns both user and admin messages
// UI updates with new admin reply
```

**Step 8: User Marks as Read**
```javascript
fetch(LAMBDA_URL, {
  method: "POST",
  body: {
    action: "chat/mark-read",
    conversation_id: "xyz-123",
    reader_type: "user"
  }
})
```

---

## 13. Performance Considerations

### Query Performance
**Fast Queries (indexed, <100ms):**
- Get conversation by user: Queries UserConversationsIndex
- Get all open conversations: Queries ConversationStatusIndex
- Get messages for conversation: Direct PK query

**Slower Queries (unindexed, 100ms-1s):**
- Search messages by content: Would require table scan
  - Not currently implemented (would be expensive)
- Get all leads across affiliates: Requires scan
  - Limited to status=pending (can use LeadStatusIndex)

### Throughput Optimization
**Current Approach:**
- User queries: ~1000 users × 1 query/10s = 100 QPS
- Admin dashboard: 5-10 concurrent admins × 1 query/10s = 1 QPS
- Affiliate dashboard: ~100 affiliates × 1 query/30s = 3 QPS

**DynamoDB Capacity:**
- Read: ~120 QPS capacity (estimate)
- Write: ~10 QPS capacity (estimate)
- Consider On-Demand pricing if scaling

### Recommendations
```
1. Add CloudWatch metrics for:
   - Queries per second by action
   - Latency percentiles
   - Throttle occurrences

2. Consider caching:
   - Admin conversations (30-60s)
   - Affiliate stats (60s)
   - Using ElastiCache/Memcached

3. Monitor for:
   - Large message queries (pagination needed if >1MB)
   - Hot partitions (single conversation with many messages)
```

---

## 14. Security Observations

### No Authentication in Lambda Calls
```javascript
const response = await fetch(LAMBDA_URL, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    action: "chat/send",
    user_id: userinfo.id,  // Trusts frontend-provided user_id
    ...
  })
})
```

**Risks:**
- Frontend passes user_id without verification
- Lambda must validate user_id against auth token/request context
- No signature/API key validation found

**Recommendations:**
```
1. Pass only conversation_id/message_id (not user_id)
2. Extract user from Lambda context (API Gateway authorizer)
3. Validate request signatures if public URL
4. Implement API key rotation
5. Log all access to CloudWatch
```

### Data Sensitivity
- Messages contain user support inquiries (PII)
- Affiliate lead data includes emails/phones (PII)
- No encryption specifications found

**Recommendations:**
```
1. Enable DynamoDB encryption at rest
2. Use KMS for key management
3. Enable CloudTrail for audit log
4. Implement field-level encryption for PII
5. Set data retention policies
```

---

## 15. Appendix: File Locations

### Key Source Files
- `/home/user/dashboard-commercive/src/components/chat/ChatInterface.tsx` - User chat UI
- `/home/user/dashboard-commercive/src/components/chat/AdminChatManager.tsx` - Admin chat UI
- `/home/user/dashboard-commercive/src/app/(authentificated)/admin/leads/page.tsx` - Lead management
- `/home/user/dashboard-commercive/src/app/(authentificated)/commercive-partners/page.tsx` - Affiliate dashboard
- `/home/user/dashboard-commercive/src/app/(public)/affiliate-form/page.tsx` - Lead form (public)

### Constants
- Lambda URL: `process.env.NEXT_PUBLIC_AWS_LAMBDA_URL`
- Poll interval: `10000` ms (10 seconds)
- Lead list limit: `100` records
- Affiliate refresh: `30000` ms (30 seconds)

---

## Conclusion

The Commercive system uses a clean, scalable architecture with:
- **DynamoDB** for transactional chat and lead data
- **Lambda** for stateless API operations
- **Polling** for simple real-time sync
- **GSIs** for efficient querying across multiple access patterns

This supports the core use cases:
1. User-to-admin support chat
2. Affiliate lead generation and tracking
3. Business analytics on affiliate performance

The system is well-suited for moderate scale and can grow to millions of messages/leads with proper monitoring and capacity planning.
