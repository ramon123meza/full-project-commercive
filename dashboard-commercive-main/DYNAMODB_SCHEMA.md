# DynamoDB Schema - Quick Reference Guide

## Table 1: Conversations
```
Primary Key:
  PK: conversation_id (String, UUID)
  SK: created_at (Number, timestamp)

Global Secondary Indexes:
  UserConversationsIndex:
    PK: user_id
    SK: updated_at (Desc)
    
  ConversationStatusIndex:
    PK: status
    SK: updated_at (Desc)

Attributes:
  conversation_id: String       # "550e8400-e29b-41d4-a716-446655440000"
  user_id: String              # Supabase user ID
  store_url: String            # "mystore.myshopify.com"
  status: String               # "open" | "closed"
  created_at: Number           # 1732025476500
  updated_at: Number           # 1732025476500
  last_message: String         # "Hello, I need help"
  unread_admin: Number         # 0
  unread_user: Number          # 1

Example Item:
{
  conversation_id: "abc123",
  created_at: 1732000000,
  user_id: "user-xyz",
  store_url: "shop.myshopify.com",
  status: "open",
  updated_at: 1732025476,
  last_message: "Please help with order",
  unread_admin: 1,
  unread_user: 0
}
```

---

## Table 2: Messages
```
Primary Key:
  PK: conversation_id (String)
  SK: message_id (String)

Attributes:
  message_id: String           # "msg-123456"
  conversation_id: String      # FK to Conversations
  sender_type: String          # "user" | "admin"
  sender_id: String            # User who sent message
  message_text: String         # Message content
  created_at: Number           # 1732025476500
  is_read: Boolean             # true | false

Example Item:
{
  conversation_id: "abc123",
  message_id: "msg-001",
  sender_type: "user",
  sender_id: "user-xyz",
  message_text: "Hello, I need help with my order",
  created_at: 1732000001,
  is_read: false
}
```

---

## Table 3: Leads
```
Primary Key:
  PK: lead_id (String, UUID)
  SK: created_at (Number)

Global Secondary Indexes:
  AffiliateLeadsIndex:
    PK: affiliate_id
    SK: created_at (Desc)
    
  LeadStatusIndex:
    PK: status
    SK: created_at (Desc)
    
  LinkLeadsIndex:
    PK: link_id
    SK: created_at

Attributes:
  lead_id: String              # "lead-123456"
  affiliate_id: String         # Referrer's Supabase user ID
  link_id: String              # "ABC123" (from affiliate link)
  status: String               # "pending" | "approved" | "rejected"
  lead_name: String            # "John Doe"
  lead_email: String           # "john@example.com"
  lead_phone: String           # "+1234567890"
  product_link: String         # "https://aliexpress.com/..."
  order_volume: String         # "1-5" | "5-20" | "20-100" | "100+"
  pending_orders: String       # "10"
  commission_amount: Number    # 100.00 (optional, set on approval)
  admin_notes: String          # Internal notes (optional)
  created_at: Number           # 1732025476500
  updated_at: Number           # 1732025476500

Example Item:
{
  lead_id: "lead-123",
  created_at: 1732000000,
  affiliate_id: "affiliate-xyz",
  link_id: "ABC123",
  status: "approved",
  lead_name: "Jane Smith",
  lead_email: "jane@store.com",
  lead_phone: "+1-800-123-4567",
  product_link: "https://aliexpress.com/item/123",
  order_volume: "20-100",
  pending_orders: "25",
  commission_amount: 150.00,
  admin_notes: "High-value B2B customer",
  updated_at: 1732025476
}
```

---

## Table 4: Affiliate Links
```
Primary Key:
  PK: affiliate_id (String)
  SK: created_at (Number) OR link_id (String)

Attributes:
  affiliate_id: String         # Supabase user ID
  link_id: String              # "ABC123XYZ" (short unique code)
  affiliate_email: String      # "affiliate@example.com"
  affiliate_url: String        # "https://dashboard.commercive.co/affiliate-form?ref=ABC123"
  store_url: String            # Store domain
  created_at: Number           # 1732025476500
  updated_at: Number           # 1732025476500

Example Item:
{
  affiliate_id: "affiliate-xyz",
  created_at: 1732000000,
  link_id: "ABC123XYZ",
  affiliate_email: "partner@example.com",
  affiliate_url: "https://dashboard.commercive.co/affiliate-form?ref=ABC123XYZ",
  store_url: "commercive.co",
  updated_at: 1732025476
}
```

---

## Access Patterns by Table

### Conversations Table Queries

| Use Case | Operation | Query | Performance |
|----------|-----------|-------|-------------|
| User gets conversations | Query | GSI: user_id, sorted by updated_at DESC | FAST (GSI) |
| Admin gets open chats | Query | GSI: status="open", sorted by updated_at DESC | FAST (GSI) |
| Get by ID | GetItem | PK: conversation_id | FAST (direct) |
| Update status | UpdateItem | PK: conversation_id | FAST |
| Increment unread | UpdateItem | PK: conversation_id, SET unread_admin = unread_admin + 1 | FAST |

### Messages Table Queries

| Use Case | Operation | Query | Performance |
|----------|-----------|-------|-------------|
| Get all messages | Query | PK: conversation_id, sorted by created_at ASC | FAST |
| Mark read | Update (batch) | PK: conversation_id, filter: is_read=false, SET is_read=true | MEDIUM |
| Count unread | Query | PK: conversation_id, filter: is_read=false | MEDIUM |

### Leads Table Queries

| Use Case | Operation | Query | Performance |
|----------|-----------|-------|-------------|
| Admin pending leads | Query | GSI: status="pending", limit 100 | FAST (GSI) |
| By affiliate | Query | GSI: affiliate_id, sorted by created_at DESC | FAST (GSI) |
| By status | Query | GSI: status, sorted by created_at DESC | FAST (GSI) |
| Get by lead ID | GetItem | PK: lead_id | FAST |
| Update status | UpdateItem | PK: lead_id | FAST |

---

## Data Consistency Patterns

### Strong Consistency
All operations use strong consistency (Lambda backend handles):
- User gets their own conversations
- Admin reads conversation
- Lead creation and status updates

### Eventual Consistency (Acceptable)
10-second polling interval masks eventual consistency delays:
- New messages appear within 10 seconds
- Unread counts update within 10 seconds

### Atomic Operations
Transactions used for:
- Creating conversation + first message (2 puts)
- Approving lead + updating stats
- Closing conversation + marking all read

---

## Capacity Planning Estimates

### Read Capacity
```
Base Queries per Second:
  ~1000 users checking conversations: 100 QPS
  ~10 admins checking conversations: 1 QPS
  ~100 affiliates checking stats: 3 QPS
  Polling overhead: ~104 QPS

Recommended RCU: 500 provisioned (or On-Demand)
```

### Write Capacity
```
Base Operations per Second:
  ~100 messages sent per second: 100 WCU
  ~5 leads submitted per second: 5 WCU
  ~2 affiliate links created per day: <0.01 WCU

Recommended WCU: 200 provisioned (or On-Demand)
```

### Storage Estimate
```
Conversations: 1000s = ~100KB (100 bytes per)
Messages: 1000s to 100k = ~100MB (1KB per message avg)
Leads: 1000s = ~500KB (500 bytes per)
Affiliate Links: 100s = ~50KB (500 bytes per)

Total: ~100MB (small, can grow with scale)
```

---

## Sample Queries (Pseudocode)

### Query 1: Get user's conversations
```
Table: Conversations
Index: UserConversationsIndex
Operation: Query
KeyConditionExpression: user_id = 'user-123'
SortOrder: DESC (updated_at)
Results: [Conversation]
```

### Query 2: Get messages in conversation
```
Table: Messages
Operation: Query
KeyConditionExpression: conversation_id = 'conv-456'
SortOrder: ASC (created_at)
Results: [Message]
```

### Query 3: Get pending leads (admin)
```
Table: Leads
Index: LeadStatusIndex
Operation: Query
KeyConditionExpression: status = 'pending'
SortOrder: DESC (created_at)
Limit: 100
Results: [Lead]
```

### Query 4: Mark messages as read
```
Table: Messages & Conversations
Operation: Update (transaction)
Step 1: Query conversation_id where is_read = false
Step 2: Update all -> is_read = true
Step 3: Update Conversations.unread_user = 0
```

### Query 5: Count leads by affiliate
```
Table: Leads
Index: AffiliateLeadsIndex
Operation: Query
KeyConditionExpression: affiliate_id = 'aff-123'
Select: COUNT
Results: Integer (total leads)
```

---

## Lambda to DynamoDB Mapping

```
Frontend Lambda Call          => DynamoDB Operations
=========================================================================

chat/conversations            => Query Conversations via UserConversationsIndex
chat/messages                 => Query Messages by conversation_id
chat/send                     => Put Conversations + Messages (transaction)
chat/reply                    => Put Messages + Update Conversations
chat/mark-read                => Update Messages (batch) + Conversations
chat/close                    => Update Conversations (status="closed")
admin/conversations           => Query Conversations via ConversationStatusIndex
admin/leads                   => Query Leads via LeadStatusIndex
affiliate/get-link            => GetItem Affiliate Links by affiliate_id
affiliate/create-link         => Put Affiliate Links
affiliate/submit-lead         => Put Leads + GetItem Affiliate Links
affiliate/stats               => Query Leads by affiliate_id (aggregated)
admin/approve-lead            => UpdateItem Leads (status + commission)
```

---

## Index Statistics (Estimated)

### UserConversationsIndex
- Items: ~10,000-100,000 (varies per user)
- Typical query size: 10-50 items
- Peak users concurrent: 100+

### ConversationStatusIndex
- Partition key cardinality: 2 ("open", "closed")
- Open conversations: ~1000 items
- Closed conversations: ~10,000+ items
- Hot partition risk: YES (open conversations)

### LeadStatusIndex
- Partition key cardinality: 3 ("pending", "approved", "rejected")
- Pending leads: 100-1000 (hottest)
- Approved leads: 10,000+ 
- Rejected leads: 1000+

### AffiliateLeadsIndex
- Partition key cardinality: 100s (unique affiliate_ids)
- Items per affiliate: 1-100
- Well distributed (low hot partition risk)

---

## TTL Recommendations

If implementing TTL for cost reduction:

```
Leads Table:
  - Expired leads keep for compliance: 3 years
  - TTL Attribute: expires_at (created_at + 94608000 seconds)

Messages Table:
  - Archive after 2 years for legal/audit
  - TTL Attribute: expires_at (created_at + 63072000 seconds)

Affiliate Links:
  - NO TTL (historical tracking needed)
```

---

## Troubleshooting Guide

### Issue: Conversations query is slow
**Cause:** Large GSI partition (all open conversations)
**Solution:** 
- Add status field filtering
- Implement pagination with LastEvaluatedKey
- Consider caching hot conversations

### Issue: Messages query returns too much data
**Cause:** Conversation with thousands of messages
**Solution:**
- Implement pagination/cursor
- Return only recent messages + load older on scroll
- Archive very old messages to S3

### Issue: Admin dashboard feels laggy
**Cause:** 10-second polling is too slow
**Solution:**
- Reduce poll interval to 5 seconds
- Implement WebSocket with DynamoDB Streams (more complex)
- Add local optimistic updates to UI

### Issue: DynamoDB throttling errors
**Cause:** Exceeding provisioned capacity
**Solution:**
- Enable On-Demand billing
- Increase provisioned capacity
- Optimize hot partitions (add more attributes to PK)

