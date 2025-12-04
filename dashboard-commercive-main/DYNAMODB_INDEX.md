# DynamoDB Schema & Architecture - Complete Documentation

## Overview
This directory contains comprehensive documentation of the DynamoDB schema and architecture used in the Commercive Dashboard. The system uses AWS Lambda + DynamoDB as the backend for real-time chat, affiliate management, and lead tracking.

## Documentation Files

### 1. DYNAMODB_ANALYSIS.md (30 KB)
**Complete deep-dive analysis of the DynamoDB schema**

**Contents:**
- Executive summary (4 primary tables, 13 Lambda actions, 10-second polling)
- Detailed table definitions:
  - Conversations Table (primary key, GSIs, attributes, access patterns)
  - Messages Table (structure and queries)
  - Leads Table (affiliate lead tracking)
  - Affiliate Links Table (tracking links)
  - Affiliate Stats Table (computed statistics)
- Access patterns with detailed explanations
- Lambda endpoint summary (13 actions mapped to DynamoDB operations)
- Real-time synchronization via polling
- Batch operations and transactions
- TTL configuration recommendations
- DynamoDB Streams information
- Performance considerations
- Security observations
- Complete data flow example
- Appendix with file locations

**Best For:** Understanding the complete system architecture, detailed query patterns, and implementing changes to the backend.

**Read Time:** 30-45 minutes

---

### 2. DYNAMODB_SCHEMA.md (11 KB)
**Quick reference guide with visual schemas**

**Contents:**
- Table 1-4 schema definitions with example JSON items
- Access patterns table by operation type
- Data consistency patterns
- Capacity planning estimates
- Sample queries in pseudocode
- Lambda to DynamoDB operation mapping
- Index statistics and cardinality
- TTL recommendations
- Troubleshooting guide

**Best For:** Quick lookup of table structures, capacity planning, and troubleshooting issues.

**Read Time:** 10-15 minutes

---

### 3. CODE_REFERENCES.md (18 KB)
**Exact file locations and implementation examples**

**Contents:**
- File locations for each feature
- Lambda endpoint call examples with full code:
  - Get conversations
  - Get messages
  - Send message
  - Mark as read
  - Admin operations
  - Affiliate operations
- Type definitions (Message, Conversation, Lead)
- Polling configuration
- Environment configuration
- API response validation
- Performance optimizations
- Summary statistics

**Best For:** Implementing features, understanding code patterns, and finding specific implementation examples.

**Read Time:** 15-20 minutes

---

## Quick Start by Use Case

### I need to understand the chat system
Start with: **DYNAMODB_SCHEMA.md** → Section "Conversations Table"
Then read: **CODE_REFERENCES.md** → "Chat System" section
Then deep-dive: **DYNAMODB_ANALYSIS.md** → Sections 2.1-2.7 (Chat Access Patterns)

### I need to understand affiliate/lead management
Start with: **DYNAMODB_SCHEMA.md** → Section "Table 3: Leads"
Then read: **CODE_REFERENCES.md** → "Affiliate System" section
Then deep-dive: **DYNAMODB_ANALYSIS.md** → Sections 2.8-2.13 (Affiliate Access Patterns)

### I need to fix a performance issue
Start with: **DYNAMODB_ANALYSIS.md** → Section 13 (Performance Considerations)
Then check: **DYNAMODB_SCHEMA.md** → Section "Troubleshooting Guide"
Then review: **DYNAMODB_SCHEMA.md** → Section "Access Patterns by Table"

### I need to add a new feature
Start with: **CODE_REFERENCES.md** → Find similar feature
Then check: **DYNAMODB_SCHEMA.md** → Review relevant table schema
Then plan: **DYNAMODB_ANALYSIS.md** → Section 5 (GSI Definitions) and Section 7 (Batch Operations)

### I need to optimize queries
Start with: **DYNAMODB_SCHEMA.md** → Section "Index Statistics (Estimated)"
Then check: **DYNAMODB_ANALYSIS.md** → Section 13 (Performance)
Then implement: **CODE_REFERENCES.md** → Review polling implementation

---

## Key Findings Summary

### Architecture
- **Frontend:** Next.js (Vercel deployment)
- **Backend:** AWS Lambda (stateless API gateway)
- **Database:** DynamoDB (primary data store)
- **Real-time:** 10-second polling (HTTP GET, not WebSockets)
- **Authentication:** Supabase Auth (user IDs passed to Lambda)

### Tables (4 Total)
1. **Conversations** - User-to-admin support chat
   - Primary Key: conversation_id
   - GSIs: UserConversationsIndex, ConversationStatusIndex

2. **Messages** - Individual chat messages
   - Primary Key: (conversation_id, message_id)
   - Stores message text, sender, timestamp, read status

3. **Leads** - Affiliate-generated leads
   - Primary Key: lead_id
   - GSIs: AffiliateLeadsIndex, LeadStatusIndex, LinkLeadsIndex

4. **Affiliate Links** - Unique tracking links
   - Primary Key: affiliate_id
   - Stores link_id, affiliate_url, email

### Lambda Actions (13 Total)
- 6 Chat actions: conversations, messages, send, reply, mark-read, close
- 1 Admin chat: admin/conversations
- 3 Affiliate actions: get-link, create-link, submit-lead
- 1 Affiliate stats: stats
- 2 Admin lead actions: leads, approve-lead

### Access Patterns
- **By User:** Query via user_id GSI
- **By Status:** Query via status GSI
- **By Time:** Sort by created_at or updated_at
- **Direct:** GetItem by primary key
- **Batch Updates:** Mark all messages as read in conversation

### Performance Profile
- **Read:** ~100-120 QPS (estimated)
- **Write:** ~10-15 WCU (estimated)
- **Polling:** 10 seconds (chat), 30 seconds (admin/affiliate)
- **Query Limit:** 100 items per request
- **Storage:** ~100 MB (small scale)

### Security Considerations
- Lambda URL is public (CORS enabled)
- User IDs passed from frontend (Lambda must validate)
- No request signatures found
- Supports on-demand billing to prevent throttling

### Data Lifecycle
- Conversations: Persist indefinitely (support records)
- Messages: Persist indefinitely (audit trail)
- Leads: Persist indefinitely (sales pipeline)
- Affiliate Links: Persist indefinitely (earnings tracking)

---

## File Organization in Project

```
/home/user/dashboard-commercive/
├── DYNAMODB_ANALYSIS.md          # This directory
├── DYNAMODB_SCHEMA.md            # Quick reference
├── CODE_REFERENCES.md            # Implementation details
├── README.md                      # Original project README
├── src/
│   ├── components/
│   │   └── chat/
│   │       ├── ChatInterface.tsx         # User chat (10s polling)
│   │       └── AdminChatManager.tsx      # Admin chat
│   ├── app/
│   │   ├── (public)/
│   │   │   └── affiliate-form/
│   │   │       └── page.tsx              # Lead submission form
│   │   ├── (authentificated)/
│   │   │   ├── admin/
│   │   │   │   └── leads/
│   │   │   │       └── page.tsx          # Admin lead management
│   │   │   └── commercive-partners/
│   │   │       └── page.tsx              # Affiliate dashboard
│   │   └── api/
│   │       └── forecast/
│   │           └── route.ts              # Supabase-based forecasting
│   └── utils/
│       └── constants.ts                  # Environment variables
└── supabase-migrations/
    └── add_onboarding_fields.sql         # Supabase schema
```

---

## Infrastructure Notes

### Not in Repository
- CloudFormation/CDK templates for DynamoDB
- Lambda function code
- API Gateway configuration
- DynamoDB provisioning setup

### Infrastructure Likely Located In
- Separate AWS infrastructure repo
- AWS CDK project
- CloudFormation stack
- Serverless Framework

### To Deploy Changes
1. Update frontend code (this repo)
2. Update Lambda function in backend repo
3. Ensure DynamoDB tables exist with proper GSIs
4. Set environment variable: `NEXT_PUBLIC_AWS_LAMBDA_URL`

---

## Common Tasks

### Add New Message to Conversation
1. User calls: `sendMessage()` in ChatInterface.tsx
2. Frontend POST to: `${LAMBDA_URL}` action: "chat/send"
3. Lambda creates: Messages record + updates Conversations record
4. User's 10s polling detects new message
5. Admin polling (also 10s) shows message

### Process Affiliate Lead
1. User submits form: `/affiliate-form?ref=ABC123XYZ`
2. Frontend POST: action "affiliate/submit-lead" with link_id
3. Lambda creates: Leads record, looks up affiliate from link_id
4. Admin polling detects new lead every 30s
5. Admin approves/rejects: Updates Leads record with status + commission

### Query Affiliate Statistics
1. Affiliate dashboard: `fetchLambdaStats()`
2. Frontend GET: action "affiliate/stats" with affiliate_id
3. Lambda queries: Leads table by affiliate_id GSI
4. Returns: Count of leads by status, total commission
5. Updates chart on frontend every 30s

---

## Monitoring & Operations

### Key Metrics to Monitor
1. **DynamoDB Metrics:**
   - ConsumedReadCapacityUnits (should stay < provisioned)
   - ConsumedWriteCapacityUnits
   - UserErrors (invalid requests)
   - SystemErrors (AWS issues)

2. **Lambda Metrics:**
   - Duration (should be <100ms for most calls)
   - Errors (failed invocations)
   - Throttles (rate limiting)
   - Concurrent Executions

3. **Application Metrics:**
   - Message latency (created_at to visible)
   - Lead processing time
   - Polling hit rate (10s interval efficiency)

### Alerting Recommendations
- DynamoDB throttling errors
- Lambda function errors
- Lambda duration >1s
- Message delivery latency >30s
- Lead processing time >5 minutes

---

## Migration & Scaling Considerations

### Current Scale
- ~1000s of users (estimated)
- ~100s of conversations
- 10-100s of messages per conversation
- 100s of leads
- 10-30 seconds refresh intervals

### Scaling to 100k Users
1. Enable DynamoDB On-Demand pricing
2. Add caching layer (ElastiCache) for hot data
3. Reduce polling intervals (5s for hot users)
4. Consider DynamoDB Streams for real-time events
5. Archive old messages to S3
6. Implement message pagination (load 50 most recent)

### Future Architecture
1. Add WebSocket support via API Gateway
2. Implement DynamoDB Streams → Lambda → WebSocket
3. Replace polling with event-driven notifications
4. Add analytics database (Redshift/ClickHouse)
5. Implement caching layer (Redis)

---

## Troubleshooting Quick Reference

| Issue | Cause | Solution | Reference |
|-------|-------|----------|-----------|
| Messages not appearing | Polling too slow | Reduce POLL_INTERVAL | CODE_REFERENCES.md |
| Throttling errors | Exceeding capacity | Use On-Demand billing | DYNAMODB_ANALYSIS.md |
| Missing conversations | Not querying GSI | Use UserConversationsIndex | DYNAMODB_SCHEMA.md |
| Slow queries | Large GSI partition | Add pagination | DYNAMODB_ANALYSIS.md |
| Stale data | Polling misses updates | Cache invalidation needed | DYNAMODB_ANALYSIS.md |

---

## Related Files in Codebase

### TypeScript Definitions
- `/src/app/utils/types.ts` - Application types
- `/src/app/utils/supabase/database.types.ts` - Supabase schema types
- Inline interfaces in component files (Message, Conversation, Lead)

### Configuration
- `/src/app/utils/constants.ts` - Constants and options
- `.env` (not in repo) - NEXT_PUBLIC_AWS_LAMBDA_URL

### Styling
- `tailwind.config.ts` - UI styling
- Material-UI components - Chat UI

---

## Contact & Support

For questions about:
- **Schema design:** See DYNAMODB_ANALYSIS.md Section 1
- **Implementation:** See CODE_REFERENCES.md
- **Optimization:** See DYNAMODB_ANALYSIS.md Section 13
- **Troubleshooting:** See DYNAMODB_SCHEMA.md Troubleshooting Guide

---

## Document Generation Info
- Generated: November 19, 2025
- Source Repository: `/home/user/dashboard-commercive`
- Analysis Method: Frontend code analysis + pattern inference
- Backend Details: Inferred from API calls (backend repo separate)

---

Last Updated: November 19, 2025
