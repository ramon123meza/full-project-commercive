# LAMBDA FUNCTION IMPROVEMENTS

## Critical Fixes Required

### 1. Add Error Handling for Missing GSIs

The Lambda function currently assumes all GSIs exist. Add this helper function at the top:

```python
def safe_query_with_gsi(table, index_name, key_condition_expression, expression_attribute_values, **kwargs):
    """
    Safely query DynamoDB with GSI, falling back to scan if GSI doesn't exist
    """
    try:
        response = table.query(
            IndexName=index_name,
            KeyConditionExpression=key_condition_expression,
            ExpressionAttributeValues=expression_attribute_values,
            **kwargs
        )
        return response
    except ClientError as e:
        error_code = e.response['Error']['Code']
        if error_code == 'ResourceNotFoundException':
            # GSI doesn't exist, fall back to scan with filter
            print(f"GSI {index_name} not found, falling back to scan")

            # Extract filter condition from key condition
            # This is a simplified fallback - adjust based on your needs
            filter_expression = key_condition_expression.replace('=', '= :')

            response = table.scan(
                FilterExpression=filter_expression,
                ExpressionAttributeValues=expression_attribute_values,
                **kwargs
            )
            return response
        else:
            raise e
```

### 2. Update `get_all_conversations` Function

Replace lines ~730-745 with:

```python
def get_all_conversations(params: Dict[str, str]) -> Dict[str, Any]:
    """
    GET /admin/conversations?status=open&limit=50
    Get all chat conversations for admin dashboard
    """
    try:
        status_filter = params.get('status', 'open')
        limit = int(params.get('limit', '50'))

        # Use safe query with fallback
        response = safe_query_with_gsi(
            table=chat_conversations_table,
            index_name='status-created_at-index',
            key_condition_expression='#status = :status',
            expression_attribute_names={'#status': 'status'},
            expression_attribute_values={':status': status_filter},
            scan_index_forward=False,  # Most recent first
            limit=limit
        )

        conversations = response.get('Items', [])

        return simple_response(200, {
            'conversations': conversations,
            'count': len(conversations)
        })

    except Exception as e:
        print(f"Error in get_all_conversations: {str(e)}")
        return simple_response(500, {'error': 'Internal server error', 'message': str(e)})
```

### 3. Update `get_all_leads` Function

Replace lines ~750-770 with:

```python
def get_all_leads(params: Dict[str, str]) -> Dict[str, Any]:
    """
    GET /admin/leads?status=pending&limit=100
    Get all leads for admin review
    """
    try:
        status_filter = params.get('status', 'pending')
        limit = int(params.get('limit', '100'))

        # Use safe query with fallback
        response = safe_query_with_gsi(
            table=leads_table,
            index_name='status-created_at-index',
            key_condition_expression='#status = :status',
            expression_attribute_names={'#status': 'status'},
            expression_attribute_values={':status': status_filter},
            scan_index_forward=False,  # Most recent first
            limit=limit
        )

        leads = response.get('Items', [])

        return simple_response(200, {
            'leads': leads,
            'count': len(leads)
        })

    except Exception as e:
        print(f"Error in get_all_leads: {str(e)}")
        return simple_response(500, {'error': 'Internal server error', 'message': str(e)})
```

### 4. Add CORS Headers to Function URL

The Lambda function URL needs CORS configuration. Add this in AWS Console:

1. Go to Lambda Console → Your Function → Configuration → Function URL
2. Click "Edit"
3. Under "Configure cross-origin resource sharing (CORS)":
   - Allow origin: `https://dashboard.commercive.co` (or `*` for testing)
   - Allow methods: `GET, POST, OPTIONS`
   - Allow headers: `Content-Type, Authorization`
   - Max age: `86400`

### 5. Add Health Check Enhancement

Replace the health check section with:

```python
        # Health check
        elif action in ['', 'health', 'ping']:
            # Test database connectivity
            try:
                chat_conversations_table.get_item(Key={'conversation_id': 'health-check'})
                db_status = 'connected'
            except:
                db_status = 'error'

            return simple_response(200, {
                'status': 'healthy',
                'service': 'Commercive Lambda Backend',
                'timestamp': int(time.time() * 1000),
                'database': db_status,
                'region': AWS_REGION
            })
```

## Deployment Instructions

1. **Install Dependencies** (if not already done):
   ```bash
   pip install boto3 -t lambda/
   ```

2. **Create DynamoDB Tables**:
   ```bash
   python lambda/dynamodb-setup.py
   ```

3. **Package Lambda Function**:
   ```bash
   cd lambda
   zip -r function.zip lambda_function.py
   ```

4. **Update Lambda**:
   ```bash
   aws lambda update-function-code \
     --function-name commercive-unified-backend \
     --zip-file fileb://function.zip \
     --region us-east-1
   ```

5. **Verify Deployment**:
   ```bash
   curl https://djq3ux4rykpjo7bnsjpdivvboq0bsess.lambda-url.us-east-1.on.aws/?action=health
   ```

## Testing Commands

Test each endpoint after deployment:

```bash
# Health check
curl "https://djq3ux4rykpjo7bnsjpdivvboq0bsess.lambda-url.us-east-1.on.aws/?action=health"

# Get leads (should return empty array if no leads)
curl "https://djq3ux4rykpjo7bnsjpdivvboq0bsess.lambda-url.us-east-1.on.aws/?action=admin/leads&status=pending&limit=10"

# Get conversations
curl "https://djq3ux4rykpjo7bnsjpdivvboq0bsess.lambda-url.us-east-1.on.aws/?action=admin/conversations&status=open&limit=10"
```

## Monitoring

Add CloudWatch alarms for:
- Lambda errors > 5 in 5 minutes
- Lambda duration > 10 seconds
- DynamoDB throttling events

## Cost Optimization

Current setup uses:
- Lambda: Pay per request (~$0.20 per 1M requests)
- DynamoDB: On-demand pricing (recommended for variable traffic)

For high traffic (>100K requests/month), consider:
- Provisioned capacity for DynamoDB
- Reserved concurrency for Lambda
