"""
COMMERCIVE UNIFIED LAMBDA BACKEND
=================================
Handles all backend operations:
- Chat conversations and messages
- Affiliate link management
- Lead submission and management
- Admin operations

Deploy this to AWS Lambda with a Function URL
"""

import json
import boto3
import uuid
import time
import os
import urllib.request
import urllib.error
from decimal import Decimal
from typing import Dict, Any, List
from botocore.exceptions import ClientError

# Configuration
AWS_REGION = "us-east-1"
TABLE_PREFIX = "commercive_"
ADMIN_EMAIL = "ramoncitomeza1989@gmail.com"
SES_SENDER_EMAIL = "noreply@commercive.co"
OPENAI_API_KEY_ENV = "OPENAI_API_KEY"  # Set this in Lambda environment variables

# Initialize AWS clients
dynamodb = boto3.resource('dynamodb', region_name=AWS_REGION)
ses_client = boto3.client('ses', region_name=AWS_REGION)

# Tables - Core
chat_conversations_table = dynamodb.Table(f"{TABLE_PREFIX}chat_conversations")
chat_messages_table = dynamodb.Table(f"{TABLE_PREFIX}chat_messages")
affiliate_links_table = dynamodb.Table(f"{TABLE_PREFIX}affiliate_links")
leads_table = dynamodb.Table(f"{TABLE_PREFIX}leads")
payments_table = dynamodb.Table(f"{TABLE_PREFIX}affiliate_payments")

# Tables - User Preferences (for cross-device persistence)
try:
    user_preferences_table = dynamodb.Table(f"{TABLE_PREFIX}user_preferences")
except Exception as e:
    print(f"Note: User preferences table not available yet: {e}")
    user_preferences_table = None

# Tables - CRM Phase 2 (created by setup_database_2.py)
try:
    affiliate_orders_table = dynamodb.Table(f"{TABLE_PREFIX}affiliate_orders")
    affiliate_configs_table = dynamodb.Table(f"{TABLE_PREFIX}affiliate_configs")
    csv_imports_table = dynamodb.Table(f"{TABLE_PREFIX}csv_imports")
    affiliate_summaries_table = dynamodb.Table(f"{TABLE_PREFIX}affiliate_summaries")
except Exception as e:
    print(f"Note: Phase 2 tables not available yet: {e}")


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

class DecimalEncoder(json.JSONEncoder):
    """Handle Decimal types from DynamoDB"""
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)


def simple_response(status_code: int, body: Dict[str, Any]) -> Dict[str, Any]:
    """Create a Lambda response with CORS headers"""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
        'body': json.dumps(body, cls=DecimalEncoder)
    }


def generate_id(prefix: str = "") -> str:
    """Generate a unique ID"""
    unique = str(uuid.uuid4())[:8].upper()
    return f"{prefix}{unique}" if prefix else unique


def current_timestamp() -> int:
    """Get current timestamp in milliseconds"""
    return int(time.time() * 1000)


def safe_query_with_gsi(table, index_name, key_condition_expression, expression_attribute_values, expression_attribute_names=None, **kwargs):
    """
    Safely query DynamoDB with GSI, falling back to scan if GSI doesn't exist
    """
    try:
        params = {
            'IndexName': index_name,
            'KeyConditionExpression': key_condition_expression,
            'ExpressionAttributeValues': expression_attribute_values,
            **kwargs
        }
        if expression_attribute_names:
            params['ExpressionAttributeNames'] = expression_attribute_names

        response = table.query(**params)
        return response
    except ClientError as e:
        error_code = e.response['Error']['Code']
        if error_code in ['ResourceNotFoundException', 'ValidationException']:
            # GSI doesn't exist or validation error, fall back to scan
            print(f"GSI {index_name} query failed, falling back to scan: {str(e)}")

            # Create filter from key condition
            filter_expr = key_condition_expression
            scan_params = {
                'FilterExpression': filter_expr,
                'ExpressionAttributeValues': expression_attribute_values,
            }
            if expression_attribute_names:
                scan_params['ExpressionAttributeNames'] = expression_attribute_names
            if 'Limit' in kwargs:
                scan_params['Limit'] = kwargs['Limit']

            response = table.scan(**scan_params)
            return response
        else:
            raise e


# =============================================================================
# EMAIL NOTIFICATION FUNCTIONS
# =============================================================================

def send_lead_notification_email(lead_data: Dict[str, Any], affiliate_id: str) -> bool:
    """Send email notification when a new lead is submitted"""
    try:
        lead_name = lead_data.get('name', 'Unknown')
        lead_email = lead_data.get('email', 'No email provided')
        lead_phone = lead_data.get('phone', 'No phone provided')
        product_link = lead_data.get('product_link', 'Not provided')
        order_volume = lead_data.get('order_volume', 'Not specified')
        pending_orders = lead_data.get('pending_orders', 'Not specified')

        subject = f"New Lead Submission from {lead_name}"

        html_body = f"""
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #5B21B6 0%, #8e52f2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }}
                .content {{ background: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none; }}
                .field {{ margin-bottom: 15px; }}
                .label {{ font-weight: bold; color: #5B21B6; }}
                .value {{ margin-top: 5px; padding: 10px; background: white; border-radius: 4px; border-left: 3px solid #8e52f2; }}
                .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1 style="margin: 0;">🎉 New Lead Received!</h1>
                    <p style="margin: 10px 0 0 0;">A new potential client has submitted their information</p>
                </div>
                <div class="content">
                    <div class="field">
                        <div class="label">👤 Contact Name</div>
                        <div class="value">{lead_name}</div>
                    </div>
                    <div class="field">
                        <div class="label">📧 Email Address</div>
                        <div class="value">{lead_email}</div>
                    </div>
                    <div class="field">
                        <div class="label">📱 Phone Number</div>
                        <div class="value">{lead_phone}</div>
                    </div>
                    <div class="field">
                        <div class="label">🔗 Product Link</div>
                        <div class="value">{product_link}</div>
                    </div>
                    <div class="field">
                        <div class="label">📦 Expected Order Volume</div>
                        <div class="value">{order_volume}</div>
                    </div>
                    <div class="field">
                        <div class="label">⏳ Pending Orders</div>
                        <div class="value">{pending_orders}</div>
                    </div>
                    <div class="field">
                        <div class="label">🤝 Referred By Affiliate</div>
                        <div class="value">{affiliate_id}</div>
                    </div>
                </div>
                <div class="footer">
                    <p>This lead was submitted through the Commercive affiliate referral system.</p>
                    <p>Please review and follow up within 24 hours for best results.</p>
                </div>
            </div>
        </body>
        </html>
        """

        text_body = f"""
        New Lead Submission
        ===================

        Contact Name: {lead_name}
        Email: {lead_email}
        Phone: {lead_phone}
        Product Link: {product_link}
        Expected Order Volume: {order_volume}
        Pending Orders: {pending_orders}
        Referred By Affiliate: {affiliate_id}

        --
        This lead was submitted through the Commercive affiliate referral system.
        """

        ses_client.send_email(
            Source=SES_SENDER_EMAIL,
            Destination={
                'ToAddresses': [ADMIN_EMAIL],
            },
            Message={
                'Subject': {
                    'Data': subject,
                    'Charset': 'UTF-8'
                },
                'Body': {
                    'Text': {
                        'Data': text_body,
                        'Charset': 'UTF-8'
                    },
                    'Html': {
                        'Data': html_body,
                        'Charset': 'UTF-8'
                    }
                }
            }
        )

        print(f"[SES] Lead notification email sent successfully to {ADMIN_EMAIL}")
        return True

    except ClientError as e:
        print(f"[SES] Error sending email: {e.response['Error']['Message']}")
        return False
    except Exception as e:
        print(f"[SES] Unexpected error sending email: {str(e)}")
        return False


# =============================================================================
# AI CHATBOT FUNCTIONS (OpenAI Integration)
# =============================================================================

# System context for AI chatbot
AI_SYSTEM_CONTEXT = """You are a helpful customer support assistant for Commercive, a fulfillment and e-commerce logistics company.

About Commercive:
- We provide order fulfillment services for Shopify store owners
- We offer inventory management and tracking solutions
- We have an affiliate program where partners can earn commissions
- We ship to 65+ countries worldwide
- We offer 99.9% SLA performance
- We have processed over 8 million orders

You can help users with:
- General questions about our services
- Information about shipping and tracking
- Questions about the affiliate program
- Basic account and dashboard questions
- Inventory management inquiries

Guidelines:
- Be friendly, professional, and concise
- If you don't know something specific, offer to connect them with a human representative
- Always be helpful and solution-oriented
- Keep responses under 200 words unless more detail is needed
- If the user needs specific account help or has complex issues, recommend they request human assistance

When a user wants to speak with a human, say something like: "I understand you'd like to speak with a human representative. Please type 'CONNECT TO REPRESENTATIVE' and our support team will be notified to assist you directly."
"""

def call_openai_api(messages: List[Dict[str, str]]) -> str:
    """Make a REST API call to OpenAI without using the SDK"""
    try:
        api_key = os.environ.get(OPENAI_API_KEY_ENV)
        if not api_key:
            print("[AI] OpenAI API key not configured")
            return "I apologize, but the AI assistant is currently unavailable. Please type 'CONNECT TO REPRESENTATIVE' to speak with a human support agent."

        url = "https://api.openai.com/v1/chat/completions"

        payload = {
            "model": "gpt-3.5-turbo",
            "messages": messages,
            "max_tokens": 500,
            "temperature": 0.7
        }

        data = json.dumps(payload).encode('utf-8')

        request = urllib.request.Request(
            url,
            data=data,
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {api_key}'
            }
        )

        with urllib.request.urlopen(request, timeout=30) as response:
            result = json.loads(response.read().decode('utf-8'))
            return result['choices'][0]['message']['content']

    except urllib.error.HTTPError as e:
        print(f"[AI] OpenAI API HTTP error: {e.code} - {e.reason}")
        return "I apologize, but I'm having trouble processing your request. Please type 'CONNECT TO REPRESENTATIVE' if you need immediate assistance."
    except Exception as e:
        print(f"[AI] Error calling OpenAI: {str(e)}")
        return "I apologize, but I'm having trouble responding right now. Would you like to speak with a human representative? Just type 'CONNECT TO REPRESENTATIVE'."


def get_ai_response(user_message: str, conversation_history: List[Dict[str, Any]] = None) -> str:
    """Get AI response for a user message"""
    try:
        # Check for human handoff request
        handoff_phrases = ['connect to representative', 'human', 'speak to someone', 'real person', 'agent', 'support team', 'talk to human']
        if any(phrase in user_message.lower() for phrase in handoff_phrases):
            return "I've noted your request to speak with a human representative. Our support team has been notified and will respond to this conversation shortly. In the meantime, is there anything else I can help you with?"

        # Build messages array
        messages = [
            {"role": "system", "content": AI_SYSTEM_CONTEXT}
        ]

        # Add conversation history if available (last 10 messages for context)
        if conversation_history:
            for msg in conversation_history[-10:]:
                role = "user" if msg.get('sender_type') == 'user' else "assistant"
                messages.append({
                    "role": role,
                    "content": msg.get('message_text', '')
                })

        # Add current user message
        messages.append({"role": "user", "content": user_message})

        # Call OpenAI
        response = call_openai_api(messages)
        return response

    except Exception as e:
        print(f"[AI] Error in get_ai_response: {str(e)}")
        return "I'm sorry, I encountered an issue. Would you like to speak with a human representative?"


# =============================================================================
# CHAT ENDPOINTS
# =============================================================================

def get_user_conversations(params: Dict[str, str]) -> Dict[str, Any]:
    """GET /chat/conversations?user_id=xxx"""
    try:
        user_id = params.get('user_id')
        if not user_id:
            return simple_response(400, {'error': 'Missing user_id parameter'})

        response = safe_query_with_gsi(
            table=chat_conversations_table,
            index_name='user_id-created_at-index',
            key_condition_expression='user_id = :uid',
            expression_attribute_values={':uid': user_id},
            ScanIndexForward=False
        )

        conversations = response.get('Items', [])
        return simple_response(200, {'conversations': conversations})

    except Exception as e:
        print(f"Error in get_user_conversations: {str(e)}")
        return simple_response(500, {'error': 'Internal server error', 'message': str(e)})


def get_conversation_messages(params: Dict[str, str]) -> Dict[str, Any]:
    """GET /chat/messages?conversation_id=xxx"""
    try:
        conversation_id = params.get('conversation_id')
        if not conversation_id:
            return simple_response(400, {'error': 'Missing conversation_id parameter'})

        response = safe_query_with_gsi(
            table=chat_messages_table,
            index_name='conversation_id-created_at-index',
            key_condition_expression='conversation_id = :cid',
            expression_attribute_values={':cid': conversation_id},
            ScanIndexForward=True
        )

        messages = response.get('Items', [])
        return simple_response(200, {'messages': messages})

    except Exception as e:
        print(f"Error in get_conversation_messages: {str(e)}")
        return simple_response(500, {'error': 'Internal server error', 'message': str(e)})


def send_chat_message(body: Dict[str, Any]) -> Dict[str, Any]:
    """POST /chat/send - Send message and optionally get AI response"""
    try:
        user_id = body.get('user_id')
        store_url = body.get('store_url', '')
        message_text = body.get('message')
        conversation_id = body.get('conversation_id')
        enable_ai = body.get('enable_ai', True)  # Enable AI by default
        request_human = body.get('request_human', False)  # User wants human support

        if not user_id or not message_text:
            return simple_response(400, {'error': 'Missing required fields: user_id, message'})

        now = current_timestamp()
        is_new_conversation = False

        # Create new conversation if needed
        if not conversation_id:
            is_new_conversation = True
            conversation_id = generate_id('CONV-')
            chat_conversations_table.put_item(Item={
                'conversation_id': conversation_id,
                'user_id': user_id,
                'store_url': store_url,
                'status': 'open',
                'ai_enabled': enable_ai,
                'human_requested': request_human,
                'created_at': now,
                'updated_at': now,
                'last_message': message_text[:100],
                'unread_admin': 1 if request_human else 0,
                'unread_user': 0
            })
        else:
            # Update existing conversation
            update_expr = 'SET updated_at = :now, last_message = :msg'
            expr_values = {
                ':now': now,
                ':msg': message_text[:100]
            }

            # Only increment unread_admin if human requested or AI not enabled
            if request_human or not enable_ai:
                update_expr += ', unread_admin = unread_admin + :one'
                expr_values[':one'] = 1

            if request_human:
                update_expr += ', human_requested = :human'
                expr_values[':human'] = True

            chat_conversations_table.update_item(
                Key={'conversation_id': conversation_id},
                UpdateExpression=update_expr,
                ExpressionAttributeValues=expr_values
            )

        # Create user message
        message_id = generate_id('MSG-')
        chat_messages_table.put_item(Item={
            'message_id': message_id,
            'conversation_id': conversation_id,
            'sender_type': 'user',
            'sender_id': user_id,
            'message_text': message_text,
            'created_at': now,
            'is_read': False
        })

        ai_response = None
        ai_message_id = None

        # Generate AI response if enabled and not requesting human
        if enable_ai and not request_human:
            # Check if user is requesting human support
            handoff_phrases = ['connect to representative', 'human', 'speak to someone', 'real person', 'agent', 'support team', 'talk to human']
            if any(phrase in message_text.lower() for phrase in handoff_phrases):
                # Mark conversation for human follow-up
                chat_conversations_table.update_item(
                    Key={'conversation_id': conversation_id},
                    UpdateExpression='SET human_requested = :true, unread_admin = unread_admin + :one',
                    ExpressionAttributeValues={':true': True, ':one': 1}
                )
                ai_response = "I've noted your request to speak with a human representative. Our support team has been notified and will respond to this conversation shortly. In the meantime, is there anything else I can help you with?"
            else:
                # Get conversation history for context
                try:
                    history_response = safe_query_with_gsi(
                        table=chat_messages_table,
                        index_name='conversation_id-created_at-index',
                        key_condition_expression='conversation_id = :cid',
                        expression_attribute_values={':cid': conversation_id},
                        ScanIndexForward=True,
                        Limit=20
                    )
                    conversation_history = history_response.get('Items', [])
                except Exception as e:
                    print(f"[AI] Error fetching history: {str(e)}")
                    conversation_history = []

                # Get AI response
                ai_response = get_ai_response(message_text, conversation_history)

            # Save AI response as a message
            if ai_response:
                ai_now = current_timestamp()
                ai_message_id = generate_id('MSG-')
                chat_messages_table.put_item(Item={
                    'message_id': ai_message_id,
                    'conversation_id': conversation_id,
                    'sender_type': 'ai',
                    'sender_id': 'ai-assistant',
                    'message_text': ai_response,
                    'created_at': ai_now,
                    'is_read': False
                })

                # Update conversation with AI response
                chat_conversations_table.update_item(
                    Key={'conversation_id': conversation_id},
                    UpdateExpression='SET updated_at = :now, last_message = :msg, unread_user = unread_user + :one',
                    ExpressionAttributeValues={
                        ':now': ai_now,
                        ':msg': ai_response[:100],
                        ':one': 1
                    }
                )

        return simple_response(200, {
            'success': True,
            'conversation_id': conversation_id,
            'message_id': message_id,
            'ai_response': ai_response,
            'ai_message_id': ai_message_id,
            'is_new_conversation': is_new_conversation
        })

    except Exception as e:
        print(f"Error in send_chat_message: {str(e)}")
        return simple_response(500, {'error': 'Internal server error', 'message': str(e)})


def admin_reply_message(body: Dict[str, Any]) -> Dict[str, Any]:
    """POST /chat/reply"""
    try:
        conversation_id = body.get('conversation_id')
        admin_id = body.get('admin_id')
        message_text = body.get('message')

        if not conversation_id or not admin_id or not message_text:
            return simple_response(400, {'error': 'Missing required fields'})

        now = current_timestamp()

        # Update conversation
        chat_conversations_table.update_item(
            Key={'conversation_id': conversation_id},
            UpdateExpression='SET updated_at = :now, last_message = :msg, unread_user = unread_user + :one',
            ExpressionAttributeValues={
                ':now': now,
                ':msg': message_text[:100],
                ':one': 1
            }
        )

        # Create message
        message_id = generate_id('MSG-')
        chat_messages_table.put_item(Item={
            'message_id': message_id,
            'conversation_id': conversation_id,
            'sender_type': 'admin',
            'sender_id': admin_id,
            'message_text': message_text,
            'created_at': now,
            'is_read': False
        })

        return simple_response(200, {
            'success': True,
            'message_id': message_id
        })

    except Exception as e:
        print(f"Error in admin_reply_message: {str(e)}")
        return simple_response(500, {'error': 'Internal server error', 'message': str(e)})


def mark_messages_read(body: Dict[str, Any]) -> Dict[str, Any]:
    """POST /chat/mark-read"""
    try:
        conversation_id = body.get('conversation_id')
        reader_type = body.get('reader_type', 'user')  # 'user' or 'admin'

        if not conversation_id:
            return simple_response(400, {'error': 'Missing conversation_id'})

        # Reset unread counter
        field = 'unread_user' if reader_type == 'user' else 'unread_admin'
        chat_conversations_table.update_item(
            Key={'conversation_id': conversation_id},
            UpdateExpression=f'SET {field} = :zero',
            ExpressionAttributeValues={':zero': 0}
        )

        return simple_response(200, {'success': True})

    except Exception as e:
        print(f"Error in mark_messages_read: {str(e)}")
        return simple_response(500, {'error': 'Internal server error', 'message': str(e)})


def close_conversation(body: Dict[str, Any]) -> Dict[str, Any]:
    """POST /chat/close"""
    try:
        conversation_id = body.get('conversation_id')

        if not conversation_id:
            return simple_response(400, {'error': 'Missing conversation_id'})

        chat_conversations_table.update_item(
            Key={'conversation_id': conversation_id},
            UpdateExpression='SET #status = :closed, updated_at = :now',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':closed': 'closed',
                ':now': current_timestamp()
            }
        )

        return simple_response(200, {'success': True})

    except Exception as e:
        print(f"Error in close_conversation: {str(e)}")
        return simple_response(500, {'error': 'Internal server error', 'message': str(e)})


# =============================================================================
# ADMIN ENDPOINTS
# =============================================================================

def get_all_conversations(params: Dict[str, str]) -> Dict[str, Any]:
    """GET /admin/conversations?status=open&limit=50"""
    try:
        status_filter = params.get('status', 'open')
        limit = int(params.get('limit', '50'))

        if status_filter == 'all':
            # Scan all conversations
            response = chat_conversations_table.scan(Limit=limit)
        else:
            response = safe_query_with_gsi(
                table=chat_conversations_table,
                index_name='status-created_at-index',
                key_condition_expression='#status = :status',
                expression_attribute_names={'#status': 'status'},
                expression_attribute_values={':status': status_filter},
                ScanIndexForward=False,
                Limit=limit
            )

        conversations = response.get('Items', [])

        # Sort by updated_at descending
        conversations.sort(key=lambda x: x.get('updated_at', 0), reverse=True)

        return simple_response(200, {
            'conversations': conversations,
            'count': len(conversations)
        })

    except Exception as e:
        print(f"Error in get_all_conversations: {str(e)}")
        return simple_response(500, {'error': 'Internal server error', 'message': str(e)})


def get_all_leads(params: Dict[str, str]) -> Dict[str, Any]:
    """GET /admin/leads?status=pending&limit=100"""
    try:
        status_filter = params.get('status', 'all')
        limit = int(params.get('limit', '100'))

        if status_filter == 'all':
            # Scan all leads
            response = leads_table.scan(Limit=limit)
        else:
            response = safe_query_with_gsi(
                table=leads_table,
                index_name='status-created_at-index',
                key_condition_expression='#status = :status',
                expression_attribute_names={'#status': 'status'},
                expression_attribute_values={':status': status_filter},
                ScanIndexForward=False,
                Limit=limit
            )

        leads = response.get('Items', [])

        # Sort by created_at descending
        leads.sort(key=lambda x: x.get('created_at', 0), reverse=True)

        return simple_response(200, {
            'leads': leads,
            'count': len(leads)
        })

    except Exception as e:
        print(f"Error in get_all_leads: {str(e)}")
        return simple_response(500, {'error': 'Internal server error', 'message': str(e)})


def approve_or_reject_lead(body: Dict[str, Any]) -> Dict[str, Any]:
    """POST /admin/approve-lead"""
    try:
        lead_id = body.get('lead_id')
        status = body.get('status')  # 'approve' or 'reject'
        commission_amount = body.get('commission_amount', 0)
        admin_notes = body.get('admin_notes', '')
        rejection_reason = body.get('rejection_reason', '')

        if not lead_id or not status:
            return simple_response(400, {'error': 'Missing lead_id or status'})

        now = current_timestamp()
        new_status = 'approved' if status == 'approve' else 'rejected'

        update_expression = 'SET #status = :status, updated_at = :now, admin_notes = :notes'
        expression_values = {
            ':status': new_status,
            ':now': now,
            ':notes': admin_notes
        }

        if status == 'approve':
            update_expression += ', commission_amount = :commission'
            expression_values[':commission'] = Decimal(str(commission_amount))
        else:
            update_expression += ', rejection_reason = :reason'
            expression_values[':reason'] = rejection_reason

        leads_table.update_item(
            Key={'lead_id': lead_id},
            UpdateExpression=update_expression,
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues=expression_values
        )

        return simple_response(200, {'success': True, 'new_status': new_status})

    except Exception as e:
        print(f"Error in approve_or_reject_lead: {str(e)}")
        return simple_response(500, {'error': 'Internal server error', 'message': str(e)})


# =============================================================================
# AFFILIATE ENDPOINTS
# =============================================================================

def get_affiliate_link(params: Dict[str, str]) -> Dict[str, Any]:
    """GET /affiliate/get-link?affiliate_id=xxx"""
    try:
        affiliate_id = params.get('affiliate_id')

        if not affiliate_id:
            return simple_response(400, {'error': 'Missing affiliate_id parameter'})

        # Query for links by affiliate_id
        response = safe_query_with_gsi(
            table=affiliate_links_table,
            index_name='affiliate_id-created_at-index',
            key_condition_expression='affiliate_id = :aid',
            expression_attribute_values={':aid': affiliate_id},
            ScanIndexForward=False,
            Limit=1
        )

        links = response.get('Items', [])

        if links:
            link = links[0]
            return simple_response(200, {
                'success': True,
                'link': link,
                'form_url': f"https://dashboard.commercive.co/affiliate-form?ref={link['link_id']}"
            })
        else:
            return simple_response(404, {
                'success': False,
                'error': 'No affiliate link found'
            })

    except Exception as e:
        print(f"Error in get_affiliate_link: {str(e)}")
        return simple_response(500, {'error': 'Internal server error', 'message': str(e)})


def create_affiliate_link(body: Dict[str, Any]) -> Dict[str, Any]:
    """POST /affiliate/create-link"""
    try:
        affiliate_id = body.get('affiliate_id')
        user_id = body.get('user_id')

        if not affiliate_id:
            return simple_response(400, {'error': 'Missing affiliate_id'})

        now = current_timestamp()
        link_id = generate_id('AFF-')

        # Check if link already exists for this affiliate
        existing = safe_query_with_gsi(
            table=affiliate_links_table,
            index_name='affiliate_id-created_at-index',
            key_condition_expression='affiliate_id = :aid',
            expression_attribute_values={':aid': affiliate_id},
            Limit=1
        )

        if existing.get('Items'):
            # Return existing link
            link = existing['Items'][0]
            return simple_response(200, {
                'success': True,
                'link_id': link['link_id'],
                'form_url': f"https://dashboard.commercive.co/affiliate-form?ref={link['link_id']}",
                'message': 'Existing link returned'
            })

        # Create new link
        affiliate_links_table.put_item(Item={
            'link_id': link_id,
            'affiliate_id': affiliate_id,
            'user_id': user_id or affiliate_id,
            'created_at': now,
            'click_count': 0,
            'lead_count': 0,
            'conversion_count': 0,
            'status': 'active'
        })

        return simple_response(200, {
            'success': True,
            'link_id': link_id,
            'form_url': f"https://dashboard.commercive.co/affiliate-form?ref={link_id}"
        })

    except Exception as e:
        print(f"Error in create_affiliate_link: {str(e)}")
        return simple_response(500, {'error': 'Internal server error', 'message': str(e)})


def submit_lead(body: Dict[str, Any]) -> Dict[str, Any]:
    """
    POST /affiliate/submit-lead
    Called when someone fills out the affiliate form
    """
    try:
        link_id = body.get('link_id')
        lead_data = body.get('lead_data', {})

        # Also support alternative field names
        if not link_id:
            link_id = body.get('ref') or body.get('affiliate_link_id')
        if not lead_data:
            lead_data = body.get('lead', {})

        if not link_id:
            return simple_response(400, {'error': 'Missing link_id or ref parameter'})

        if not lead_data:
            return simple_response(400, {'error': 'Missing lead_data'})

        # Validate required lead fields
        required_fields = ['name', 'email']
        for field in required_fields:
            if not lead_data.get(field):
                return simple_response(400, {'error': f'Missing required field: {field}'})

        # Get the affiliate link to find affiliate_id
        try:
            link_response = affiliate_links_table.get_item(Key={'link_id': link_id})
            link = link_response.get('Item')

            if not link:
                # Try to find by querying (in case link_id is actually affiliate_id)
                scan_response = affiliate_links_table.scan(
                    FilterExpression='affiliate_id = :aid OR link_id = :lid',
                    ExpressionAttributeValues={
                        ':aid': link_id,
                        ':lid': link_id
                    },
                    Limit=1
                )
                if scan_response.get('Items'):
                    link = scan_response['Items'][0]
                else:
                    return simple_response(404, {'error': 'Invalid affiliate link', 'link_id': link_id})

            affiliate_id = link.get('affiliate_id', link_id)

        except Exception as e:
            print(f"Error finding affiliate link: {str(e)}")
            # Still create lead with link_id as affiliate_id
            affiliate_id = link_id

        now = current_timestamp()
        lead_id = generate_id('LEAD-')

        # Create the lead
        lead_item = {
            'lead_id': lead_id,
            'affiliate_id': affiliate_id,
            'link_id': link_id,
            'status': 'pending',
            'lead_name': lead_data.get('name', ''),
            'lead_email': lead_data.get('email', ''),
            'lead_phone': lead_data.get('phone', ''),
            'product_link': lead_data.get('product_link', ''),
            'order_volume': lead_data.get('order_volume', '0'),
            'pending_orders': lead_data.get('pending_orders', '0'),
            'created_at': now,
            'updated_at': now
        }

        leads_table.put_item(Item=lead_item)

        # Update link statistics
        try:
            affiliate_links_table.update_item(
                Key={'link_id': link_id},
                UpdateExpression='SET lead_count = if_not_exists(lead_count, :zero) + :one',
                ExpressionAttributeValues={
                    ':zero': 0,
                    ':one': 1
                }
            )
        except Exception as e:
            print(f"Error updating link stats: {str(e)}")

        # Send email notification to admin
        try:
            email_sent = send_lead_notification_email(lead_data, affiliate_id)
            print(f"[Lead] Email notification sent: {email_sent}")
        except Exception as e:
            print(f"[Lead] Error sending notification email (non-fatal): {str(e)}")

        return simple_response(200, {
            'success': True,
            'lead_id': lead_id,
            'message': 'Lead submitted successfully'
        })

    except Exception as e:
        print(f"Error in submit_lead: {str(e)}")
        return simple_response(500, {'error': 'Internal server error', 'message': str(e)})


# =============================================================================
# AFFILIATE CRM ENDPOINTS (Phase 2)
# =============================================================================

def get_affiliate_orders(params: Dict[str, str]) -> Dict[str, Any]:
    """GET /crm/orders?affiliate_id=xxx&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD"""
    try:
        affiliate_id = params.get('affiliate_id')
        start_date = params.get('start_date')
        end_date = params.get('end_date')
        limit = int(params.get('limit', '100'))

        if affiliate_id:
            # Query by affiliate_id
            if start_date and end_date:
                response = safe_query_with_gsi(
                    table=affiliate_orders_table,
                    index_name='affiliate_id-order_date-index',
                    key_condition_expression='affiliate_id = :aid AND order_date BETWEEN :start AND :end',
                    expression_attribute_values={
                        ':aid': affiliate_id,
                        ':start': start_date,
                        ':end': end_date
                    },
                    ScanIndexForward=False,
                    Limit=limit
                )
            else:
                response = safe_query_with_gsi(
                    table=affiliate_orders_table,
                    index_name='affiliate_id-created_at-index',
                    key_condition_expression='affiliate_id = :aid',
                    expression_attribute_values={':aid': affiliate_id},
                    ScanIndexForward=False,
                    Limit=limit
                )
        else:
            # Scan all orders
            response = affiliate_orders_table.scan(Limit=limit)

        orders = response.get('Items', [])
        orders.sort(key=lambda x: x.get('order_date', ''), reverse=True)

        return simple_response(200, {'orders': orders, 'count': len(orders)})

    except Exception as e:
        print(f"Error in get_affiliate_orders: {str(e)}")
        return simple_response(500, {'error': 'Internal server error', 'message': str(e)})


def create_affiliate_order(body: Dict[str, Any]) -> Dict[str, Any]:
    """POST /crm/orders/create - Create a single affiliate order"""
    try:
        required = ['affiliate_id', 'customer_code', 'order_number', 'order_date']
        for field in required:
            if not body.get(field):
                return simple_response(400, {'error': f'Missing required field: {field}'})

        now = current_timestamp()
        order_id = generate_id('ORD-')

        # Calculate commission based on type
        commission_type = body.get('commission_type', 'percentage')
        commission_rate = Decimal(str(body.get('commission_rate', 0.01)))
        invoice_total = Decimal(str(body.get('invoice_total', 0)))
        order_quantity = int(body.get('order_quantity', 1))

        if commission_type == 'per_order':
            commission_earned = commission_rate * order_quantity
        else:  # percentage
            commission_earned = invoice_total * commission_rate

        order_item = {
            'order_id': order_id,
            'affiliate_id': body['affiliate_id'],
            'affiliate_name': body.get('affiliate_name', body['affiliate_id']),  # Store affiliate name
            'customer_code': body['customer_code'],
            'store_name': body.get('store_name', ''),
            'order_number': body['order_number'],
            'order_date': body['order_date'],
            'order_quantity': order_quantity,
            'invoice_total': invoice_total,
            'commission_type': commission_type,
            'commission_rate': commission_rate,
            'commission_earned': commission_earned,
            'status': body.get('status', 'pending'),
            'created_at': str(now),
            'updated_at': str(now)
        }

        affiliate_orders_table.put_item(Item=order_item)

        print(f"[CRM] Created order {order_id} for affiliate {body['affiliate_id']}")

        return simple_response(200, {
            'success': True,
            'order_id': order_id,
            'commission_earned': float(commission_earned)
        })

    except Exception as e:
        print(f"Error in create_affiliate_order: {str(e)}")
        return simple_response(500, {'error': 'Internal server error', 'message': str(e)})


def bulk_import_orders(body: Dict[str, Any]) -> Dict[str, Any]:
    """POST /crm/orders/import - Bulk import orders from CSV data"""
    try:
        orders = body.get('orders', [])
        imported_by = body.get('imported_by', 'admin')

        if not orders:
            return simple_response(400, {'error': 'No orders provided'})

        now = current_timestamp()
        import_id = generate_id('IMP-')

        success_count = 0
        failed_count = 0
        errors = []

        for idx, order_data in enumerate(orders):
            try:
                order_id = generate_id('ORD-')

                # Calculate commission
                commission_type = order_data.get('commission_type', 'percentage')
                commission_rate = Decimal(str(order_data.get('commission_rate', 0.01)))
                invoice_total = Decimal(str(order_data.get('invoice_total', 0)))
                order_quantity = int(order_data.get('order_quantity', 1))

                if commission_type == 'per_order':
                    commission_earned = commission_rate * order_quantity
                else:
                    commission_earned = invoice_total * commission_rate

                affiliate_id = order_data.get('affiliate_id', '')
                affiliate_name = order_data.get('affiliate_name', affiliate_id)  # Default to affiliate_id if name not provided

                order_item = {
                    'order_id': order_id,
                    'affiliate_id': affiliate_id,
                    'affiliate_name': affiliate_name,  # Store affiliate name
                    'customer_code': order_data.get('customer_code', order_data.get('customer_number', '')),
                    'store_name': order_data.get('store_name', ''),
                    'order_number': str(order_data.get('order_number', '')),
                    'order_date': order_data.get('order_date', order_data.get('order_time', '')[:10] if order_data.get('order_time') else ''),
                    'order_quantity': order_quantity,
                    'invoice_total': invoice_total,
                    'commission_type': commission_type,
                    'commission_rate': commission_rate,
                    'commission_earned': commission_earned,
                    'status': 'pending',
                    'import_id': import_id,
                    'created_at': str(now),
                    'updated_at': str(now)
                }

                affiliate_orders_table.put_item(Item=order_item)
                success_count += 1

            except Exception as e:
                failed_count += 1
                errors.append({'row': idx, 'error': str(e)})

        # Record import history
        try:
            csv_imports_table.put_item(Item={
                'import_id': import_id,
                'imported_by': imported_by,
                'records_count': len(orders),
                'records_success': success_count,
                'records_failed': failed_count,
                'status': 'completed' if failed_count == 0 else 'partial',
                'error_details': json.dumps(errors) if errors else '',
                'created_at': str(now),
                'completed_at': str(now)
            })
        except Exception as e:
            print(f"Error recording import history: {e}")

        print(f"[CRM] Bulk import complete: {success_count} success, {failed_count} failed")

        return simple_response(200, {
            'success': True,
            'import_id': import_id,
            'records_processed': len(orders),
            'records_success': success_count,
            'records_failed': failed_count,
            'errors': errors if errors else None
        })

    except Exception as e:
        print(f"Error in bulk_import_orders: {str(e)}")
        return simple_response(500, {'error': 'Internal server error', 'message': str(e)})


def get_affiliate_config(params: Dict[str, str]) -> Dict[str, Any]:
    """GET /crm/config?affiliate_id=xxx OR ?customer_code=xxx"""
    try:
        affiliate_id = params.get('affiliate_id')
        customer_code = params.get('customer_code')

        if affiliate_id:
            response = safe_query_with_gsi(
                table=affiliate_configs_table,
                index_name='affiliate_id-index',
                key_condition_expression='affiliate_id = :aid',
                expression_attribute_values={':aid': affiliate_id}
            )
        elif customer_code:
            response = safe_query_with_gsi(
                table=affiliate_configs_table,
                index_name='customer_code-index',
                key_condition_expression='customer_code = :cc',
                expression_attribute_values={':cc': customer_code}
            )
        else:
            # Get all configs
            response = affiliate_configs_table.scan(Limit=500)

        configs = response.get('Items', [])
        return simple_response(200, {'configs': configs, 'count': len(configs)})

    except Exception as e:
        print(f"Error in get_affiliate_config: {str(e)}")
        return simple_response(500, {'error': 'Internal server error', 'message': str(e)})


def set_affiliate_config(body: Dict[str, Any]) -> Dict[str, Any]:
    """POST /crm/config/set - Set commission config for affiliate-customer pair"""
    try:
        affiliate_id = body.get('affiliate_id')
        customer_code = body.get('customer_code')
        commission_type = body.get('commission_type', 'percentage')
        commission_rate = body.get('commission_rate', 0.01)

        if not affiliate_id or not customer_code:
            return simple_response(400, {'error': 'Missing affiliate_id or customer_code'})

        now = current_timestamp()
        config_id = f"{affiliate_id}:{customer_code}"

        config_item = {
            'config_id': config_id,
            'affiliate_id': affiliate_id,
            'customer_code': customer_code,
            'commission_type': commission_type,
            'commission_rate': Decimal(str(commission_rate)),
            'is_active': body.get('is_active', True),
            'created_at': str(now),
            'updated_at': str(now)
        }

        affiliate_configs_table.put_item(Item=config_item)

        print(f"[CRM] Set config for {affiliate_id}:{customer_code} - {commission_type} @ {commission_rate}")

        return simple_response(200, {
            'success': True,
            'config_id': config_id
        })

    except Exception as e:
        print(f"Error in set_affiliate_config: {str(e)}")
        return simple_response(500, {'error': 'Internal server error', 'message': str(e)})


def get_affiliate_summary(params: Dict[str, str]) -> Dict[str, Any]:
    """GET /crm/summary?affiliate_id=xxx&period=2024-01 (or 'all' for lifetime)"""
    try:
        affiliate_id = params.get('affiliate_id')
        period = params.get('period', 'all')

        if not affiliate_id:
            return simple_response(400, {'error': 'Missing affiliate_id parameter'})

        # Try to get cached summary first
        try:
            summary_response = affiliate_summaries_table.get_item(
                Key={'affiliate_id': affiliate_id, 'period': period}
            )
            if summary_response.get('Item'):
                return simple_response(200, {'summary': summary_response['Item'], 'source': 'cache'})
        except Exception:
            pass

        # Calculate summary from orders
        if period == 'all':
            # Get all orders for this affiliate
            response = safe_query_with_gsi(
                table=affiliate_orders_table,
                index_name='affiliate_id-created_at-index',
                key_condition_expression='affiliate_id = :aid',
                expression_attribute_values={':aid': affiliate_id}
            )
        else:
            # Get orders for specific month (format: YYYY-MM)
            start_date = f"{period}-01"
            # Calculate end date (last day of month)
            year, month = period.split('-')
            if int(month) == 12:
                end_date = f"{int(year)+1}-01-01"
            else:
                end_date = f"{year}-{int(month)+1:02d}-01"

            response = safe_query_with_gsi(
                table=affiliate_orders_table,
                index_name='affiliate_id-order_date-index',
                key_condition_expression='affiliate_id = :aid AND order_date BETWEEN :start AND :end',
                expression_attribute_values={
                    ':aid': affiliate_id,
                    ':start': start_date,
                    ':end': end_date
                }
            )

        orders = response.get('Items', [])

        # Calculate summary
        total_orders = len(orders)
        total_revenue = sum(float(o.get('invoice_total', 0)) for o in orders)
        total_commission = sum(float(o.get('commission_earned', 0)) for o in orders)
        unique_customers = len(set(o.get('customer_code', '') for o in orders))
        avg_order_value = total_revenue / total_orders if total_orders > 0 else 0

        summary = {
            'affiliate_id': affiliate_id,
            'period': period,
            'total_orders': total_orders,
            'total_revenue': round(total_revenue, 2),
            'total_commission': round(total_commission, 2),
            'unique_customers': unique_customers,
            'average_order_value': round(avg_order_value, 2),
            'updated_at': str(current_timestamp())
        }

        # Cache the summary
        try:
            affiliate_summaries_table.put_item(Item={
                **summary,
                'total_revenue': Decimal(str(summary['total_revenue'])),
                'total_commission': Decimal(str(summary['total_commission'])),
                'average_order_value': Decimal(str(summary['average_order_value']))
            })
        except Exception as e:
            print(f"Error caching summary: {e}")

        return simple_response(200, {'summary': summary, 'source': 'calculated'})

    except Exception as e:
        print(f"Error in get_affiliate_summary: {str(e)}")
        return simple_response(500, {'error': 'Internal server error', 'message': str(e)})


def get_leads_by_affiliate(params: Dict[str, str]) -> Dict[str, Any]:
    """GET /crm/leads?affiliate_id=xxx - Get leads organized by affiliate"""
    try:
        affiliate_id = params.get('affiliate_id')
        status = params.get('status', 'all')
        limit = int(params.get('limit', '100'))

        if affiliate_id:
            # Get leads for specific affiliate
            if status != 'all':
                response = safe_query_with_gsi(
                    table=leads_table,
                    index_name='affiliate_id-status-index',
                    key_condition_expression='affiliate_id = :aid AND #status = :status',
                    expression_attribute_names={'#status': 'status'},
                    expression_attribute_values={':aid': affiliate_id, ':status': status},
                    Limit=limit
                )
            else:
                response = safe_query_with_gsi(
                    table=leads_table,
                    index_name='link_id-created_at-index',
                    key_condition_expression='affiliate_id = :aid',
                    expression_attribute_values={':aid': affiliate_id},
                    ScanIndexForward=False,
                    Limit=limit
                )
        else:
            # Get all leads, grouped by affiliate
            response = leads_table.scan(Limit=500)

        leads = response.get('Items', [])
        leads.sort(key=lambda x: x.get('created_at', 0), reverse=True)

        # Group by affiliate if no specific affiliate requested
        if not affiliate_id:
            grouped = {}
            for lead in leads:
                aid = lead.get('affiliate_id', 'unknown')
                if aid not in grouped:
                    grouped[aid] = []
                grouped[aid].append(lead)
            return simple_response(200, {'leads_by_affiliate': grouped, 'total_count': len(leads)})

        return simple_response(200, {'leads': leads, 'count': len(leads)})

    except Exception as e:
        print(f"Error in get_leads_by_affiliate: {str(e)}")
        return simple_response(500, {'error': 'Internal server error', 'message': str(e)})


def mark_orders_as_paid(body: Dict[str, Any]) -> Dict[str, Any]:
    """POST /crm/orders/mark-paid - Mark orders as paid for an affiliate"""
    try:
        affiliate_id = body.get('affiliate_id')
        order_ids = body.get('order_ids', [])
        payment_reference = body.get('payment_reference', '')
        payment_method = body.get('payment_method', 'manual')
        paid_by = body.get('paid_by', 'admin')
        paypal_email = body.get('paypal_email', '')

        if not affiliate_id:
            return simple_response(400, {'error': 'Missing affiliate_id'})

        now = current_timestamp()
        payment_id = generate_id('PAY-')

        # If no specific order_ids provided, get all pending orders for this affiliate
        if not order_ids:
            response = safe_query_with_gsi(
                table=affiliate_orders_table,
                index_name='affiliate_id-created_at-index',
                key_condition_expression='affiliate_id = :aid',
                expression_attribute_values={':aid': affiliate_id}
            )
            orders = response.get('Items', [])
            # Filter to only pending/approved orders (not already paid)
            order_ids = [o['order_id'] for o in orders if o.get('status') in ['pending', 'approved']]

        if not order_ids:
            return simple_response(400, {'error': 'No pending orders found for this affiliate'})

        # Calculate total amount
        total_amount = Decimal('0')
        updated_count = 0

        for order_id in order_ids:
            try:
                # Get order details first
                order_response = affiliate_orders_table.get_item(Key={'order_id': order_id})
                order = order_response.get('Item')

                if order:
                    commission = Decimal(str(order.get('commission_earned', 0)))
                    total_amount += commission

                    # Update order status to paid
                    affiliate_orders_table.update_item(
                        Key={'order_id': order_id},
                        UpdateExpression='SET #status = :paid, paid_at = :now, payment_reference = :ref, payment_id = :pid, updated_at = :now',
                        ExpressionAttributeNames={'#status': 'status'},
                        ExpressionAttributeValues={
                            ':paid': 'paid',
                            ':now': str(now),
                            ':ref': payment_reference or payment_id,
                            ':pid': payment_id
                        }
                    )
                    updated_count += 1
            except Exception as e:
                print(f"Error updating order {order_id}: {str(e)}")

        # Record the payment in payments table
        payment_record = {
            'payment_id': payment_id,
            'affiliate_id': affiliate_id,
            'amount': total_amount,
            'orders_count': updated_count,
            'order_ids': order_ids,
            'payment_method': payment_method,
            'payment_reference': payment_reference or payment_id,
            'paypal_email': paypal_email,
            'paid_by': paid_by,
            'status': 'completed',
            'created_at': str(now)
        }

        payments_table.put_item(Item=payment_record)

        print(f"[CRM] Marked {updated_count} orders as paid for affiliate {affiliate_id}, payment_id: {payment_id}")

        return simple_response(200, {
            'success': True,
            'payment_id': payment_id,
            'orders_updated': updated_count,
            'total_amount': float(total_amount)
        })

    except Exception as e:
        print(f"Error in mark_orders_as_paid: {str(e)}")
        return simple_response(500, {'error': 'Internal server error', 'message': str(e)})


def get_payment_history(params: Dict[str, str]) -> Dict[str, Any]:
    """GET /crm/payments/history - Get payment history for affiliates"""
    try:
        affiliate_id = params.get('affiliate_id')
        limit = int(params.get('limit', '100'))

        if affiliate_id:
            # Query payments for specific affiliate
            response = safe_query_with_gsi(
                table=payments_table,
                index_name='affiliate_id-created_at-index',
                key_condition_expression='affiliate_id = :aid',
                expression_attribute_values={':aid': affiliate_id},
                ScanIndexForward=False,
                Limit=limit
            )
        else:
            # Get all payments
            response = payments_table.scan(Limit=limit)

        payments = response.get('Items', [])
        payments.sort(key=lambda x: x.get('created_at', ''), reverse=True)

        return simple_response(200, {
            'payments': payments,
            'count': len(payments)
        })

    except Exception as e:
        print(f"Error in get_payment_history: {str(e)}")
        return simple_response(500, {'error': 'Internal server error', 'message': str(e)})


def record_payment(body: Dict[str, Any]) -> Dict[str, Any]:
    """POST /crm/payments/record - Record a payment for an affiliate"""
    try:
        affiliate_id = body.get('affiliate_id')
        affiliate_name = body.get('affiliate_name', affiliate_id)  # Include affiliate name
        amount = body.get('amount', 0)
        orders_paid = body.get('orders_paid', 0)
        payment_method = body.get('payment_method', 'paypal')
        payment_reference = body.get('payment_reference', '')
        paypal_email = body.get('paypal_email', '')
        payment_date = body.get('payment_date', str(current_timestamp()))  # Allow custom payment date

        if not affiliate_id:
            return simple_response(400, {'error': 'Missing affiliate_id'})

        now = current_timestamp()
        payment_id = generate_id('PAY-')

        payment_record = {
            'payment_id': payment_id,
            'affiliate_id': affiliate_id,
            'affiliate_name': affiliate_name,  # Store affiliate name
            'amount': Decimal(str(amount)),
            'orders_count': orders_paid,
            'payment_method': payment_method,
            'payment_reference': payment_reference or payment_id,
            'paypal_email': paypal_email,
            'payment_date': payment_date,  # Store payment date
            'status': 'completed',
            'created_at': str(now)
        }

        payments_table.put_item(Item=payment_record)

        print(f"[CRM] Recorded payment {payment_id} for affiliate {affiliate_name} ({affiliate_id}): ${amount}")

        return simple_response(200, {
            'success': True,
            'payment_id': payment_id
        })

    except Exception as e:
        print(f"Error in record_payment: {str(e)}")
        return simple_response(500, {'error': 'Internal server error', 'message': str(e)})


# =============================================================================
# USER PREFERENCES ENDPOINTS (Cross-device persistence)
# =============================================================================

def get_user_preferences(params: Dict[str, str]) -> Dict[str, Any]:
    """GET /preferences/get?user_id=xxx - Get user preferences (selected store, date range)"""
    try:
        user_id = params.get('user_id')

        if not user_id:
            return simple_response(400, {'error': 'Missing user_id parameter'})

        if user_preferences_table is None:
            return simple_response(503, {'error': 'User preferences table not available'})

        response = user_preferences_table.get_item(Key={'user_id': user_id})
        preferences = response.get('Item')

        if preferences:
            return simple_response(200, {
                'success': True,
                'preferences': preferences
            })
        else:
            return simple_response(200, {
                'success': True,
                'preferences': None,
                'message': 'No preferences found for user'
            })

    except Exception as e:
        print(f"Error in get_user_preferences: {str(e)}")
        return simple_response(500, {'error': 'Internal server error', 'message': str(e)})


def set_user_preferences(body: Dict[str, Any]) -> Dict[str, Any]:
    """POST /preferences/set - Set user preferences (selected store, date range)"""
    try:
        user_id = body.get('user_id')

        if not user_id:
            return simple_response(400, {'error': 'Missing user_id'})

        if user_preferences_table is None:
            return simple_response(503, {'error': 'User preferences table not available'})

        now = current_timestamp()

        # Build the preferences item
        preferences_item = {
            'user_id': user_id,
            'updated_at': now
        }

        # Add store preferences if provided
        if body.get('selected_store_id') is not None:
            preferences_item['selected_store_id'] = body['selected_store_id']
        if body.get('selected_store_url'):
            preferences_item['selected_store_url'] = body['selected_store_url']
        if body.get('selected_store_name'):
            preferences_item['selected_store_name'] = body['selected_store_name']

        # Add date range preferences if provided
        if body.get('date_range_start'):
            preferences_item['date_range_start'] = body['date_range_start']
        if body.get('date_range_end'):
            preferences_item['date_range_end'] = body['date_range_end']

        # Check if record exists, to preserve created_at
        try:
            existing = user_preferences_table.get_item(Key={'user_id': user_id})
            if existing.get('Item'):
                preferences_item['created_at'] = existing['Item'].get('created_at', now)
            else:
                preferences_item['created_at'] = now
        except Exception:
            preferences_item['created_at'] = now

        # Save preferences
        user_preferences_table.put_item(Item=preferences_item)

        print(f"[Preferences] Saved preferences for user {user_id}")

        return simple_response(200, {
            'success': True,
            'message': 'Preferences saved successfully'
        })

    except Exception as e:
        print(f"Error in set_user_preferences: {str(e)}")
        return simple_response(500, {'error': 'Internal server error', 'message': str(e)})


def update_store_preference(body: Dict[str, Any]) -> Dict[str, Any]:
    """POST /preferences/store - Update only the store preference"""
    try:
        user_id = body.get('user_id')
        store_id = body.get('store_id')
        store_url = body.get('store_url', '')
        store_name = body.get('store_name', '')

        if not user_id:
            return simple_response(400, {'error': 'Missing user_id'})

        if store_id is None:
            return simple_response(400, {'error': 'Missing store_id'})

        if user_preferences_table is None:
            return simple_response(503, {'error': 'User preferences table not available'})

        now = current_timestamp()

        # Use update expression to only update store fields
        update_expression = 'SET selected_store_id = :sid, selected_store_url = :surl, selected_store_name = :sname, updated_at = :now'
        expression_values = {
            ':sid': store_id,
            ':surl': store_url,
            ':sname': store_name,
            ':now': now
        }

        # Try to update existing record
        try:
            user_preferences_table.update_item(
                Key={'user_id': user_id},
                UpdateExpression=update_expression,
                ExpressionAttributeValues=expression_values
            )
        except ClientError as e:
            # If record doesn't exist, create it
            if e.response['Error']['Code'] == 'ValidationException':
                user_preferences_table.put_item(Item={
                    'user_id': user_id,
                    'selected_store_id': store_id,
                    'selected_store_url': store_url,
                    'selected_store_name': store_name,
                    'created_at': now,
                    'updated_at': now
                })
            else:
                raise

        print(f"[Preferences] Updated store preference for user {user_id}: {store_name}")

        return simple_response(200, {
            'success': True,
            'message': 'Store preference updated'
        })

    except Exception as e:
        print(f"Error in update_store_preference: {str(e)}")
        return simple_response(500, {'error': 'Internal server error', 'message': str(e)})


def update_date_range_preference(body: Dict[str, Any]) -> Dict[str, Any]:
    """POST /preferences/date-range - Update only the date range preference"""
    try:
        user_id = body.get('user_id')
        date_range_start = body.get('date_range_start')
        date_range_end = body.get('date_range_end')

        if not user_id:
            return simple_response(400, {'error': 'Missing user_id'})

        if not date_range_start or not date_range_end:
            return simple_response(400, {'error': 'Missing date_range_start or date_range_end'})

        if user_preferences_table is None:
            return simple_response(503, {'error': 'User preferences table not available'})

        now = current_timestamp()

        # Use update expression to only update date range fields
        update_expression = 'SET date_range_start = :start, date_range_end = :end, updated_at = :now'
        expression_values = {
            ':start': date_range_start,
            ':end': date_range_end,
            ':now': now
        }

        # Try to update existing record
        try:
            user_preferences_table.update_item(
                Key={'user_id': user_id},
                UpdateExpression=update_expression,
                ExpressionAttributeValues=expression_values
            )
        except ClientError as e:
            # If record doesn't exist, create it
            if e.response['Error']['Code'] == 'ValidationException':
                user_preferences_table.put_item(Item={
                    'user_id': user_id,
                    'date_range_start': date_range_start,
                    'date_range_end': date_range_end,
                    'created_at': now,
                    'updated_at': now
                })
            else:
                raise

        print(f"[Preferences] Updated date range preference for user {user_id}")

        return simple_response(200, {
            'success': True,
            'message': 'Date range preference updated'
        })

    except Exception as e:
        print(f"Error in update_date_range_preference: {str(e)}")
        return simple_response(500, {'error': 'Internal server error', 'message': str(e)})


# =============================================================================
# MAIN HANDLER
# =============================================================================

def lambda_handler(event, context):
    """Main Lambda handler"""
    try:
        # Handle preflight OPTIONS request
        http_method = event.get('requestContext', {}).get('http', {}).get('method', 'GET')
        if http_method == 'OPTIONS':
            return simple_response(200, {'message': 'CORS preflight'})

        # Parse request
        query_params = event.get('queryStringParameters') or {}
        body = {}

        if event.get('body'):
            try:
                body = json.loads(event['body'])
            except json.JSONDecodeError:
                return simple_response(400, {'error': 'Invalid JSON body'})

        # Get action from query params or body
        action = query_params.get('action', '') or body.get('action', '')

        print(f"Processing action: {action}")
        print(f"Method: {http_method}")
        print(f"Query params: {query_params}")
        print(f"Body: {json.dumps(body)[:500]}")

        # Route to appropriate handler
        # Health check
        if action in ['', 'health', 'ping']:
            return simple_response(200, {
                'status': 'healthy',
                'service': 'Commercive Lambda Backend',
                'timestamp': current_timestamp(),
                'region': AWS_REGION,
                'available_actions': [
                    'health',
                    'chat/conversations',
                    'chat/messages',
                    'chat/send',
                    'chat/reply',
                    'chat/mark-read',
                    'chat/close',
                    'admin/conversations',
                    'admin/leads',
                    'admin/approve-lead',
                    'affiliate/get-link',
                    'affiliate/create-link',
                    'affiliate/submit-lead',
                    'crm/orders',
                    'crm/orders/create',
                    'crm/orders/import',
                    'crm/orders/mark-paid',
                    'crm/config',
                    'crm/config/set',
                    'crm/summary',
                    'crm/leads',
                    'crm/payments/history',
                    'crm/payments/record',
                    'preferences/get',
                    'preferences/set',
                    'preferences/store',
                    'preferences/date-range'
                ]
            })

        # Chat endpoints
        elif action == 'chat/conversations':
            return get_user_conversations(query_params)
        elif action == 'chat/messages':
            return get_conversation_messages(query_params)
        elif action == 'chat/send':
            return send_chat_message(body)
        elif action == 'chat/reply':
            return admin_reply_message(body)
        elif action == 'chat/mark-read':
            return mark_messages_read(body)
        elif action == 'chat/close':
            return close_conversation(body)

        # Admin endpoints
        elif action == 'admin/conversations':
            return get_all_conversations(query_params)
        elif action == 'admin/leads':
            return get_all_leads(query_params)
        elif action == 'admin/approve-lead':
            return approve_or_reject_lead(body)

        # Affiliate endpoints
        elif action == 'affiliate/get-link':
            return get_affiliate_link(query_params)
        elif action == 'affiliate/create-link':
            return create_affiliate_link(body)
        elif action == 'affiliate/submit-lead':
            return submit_lead(body)

        # CRM endpoints (Phase 2)
        elif action == 'crm/orders':
            return get_affiliate_orders(query_params)
        elif action == 'crm/orders/create':
            return create_affiliate_order(body)
        elif action == 'crm/orders/import':
            return bulk_import_orders(body)
        elif action == 'crm/orders/mark-paid':
            return mark_orders_as_paid(body)
        elif action == 'crm/config':
            return get_affiliate_config(query_params)
        elif action == 'crm/config/set':
            return set_affiliate_config(body)
        elif action == 'crm/summary':
            return get_affiliate_summary(query_params)
        elif action == 'crm/leads':
            return get_leads_by_affiliate(query_params)
        elif action == 'crm/payments/history':
            return get_payment_history(query_params)
        elif action == 'crm/payments/record':
            return record_payment(body)

        # User Preferences endpoints (cross-device persistence)
        elif action == 'preferences/get':
            return get_user_preferences(query_params)
        elif action == 'preferences/set':
            return set_user_preferences(body)
        elif action == 'preferences/store':
            return update_store_preference(body)
        elif action == 'preferences/date-range':
            return update_date_range_preference(body)

        # Alternative action names for compatibility
        elif action == 'leads/submit':
            return submit_lead(body)
        elif action == 'leads/list':
            return get_all_leads(query_params)

        # Unknown action
        else:
            return simple_response(404, {
                'error': 'Unknown action',
                'action': action,
                'hint': 'Use ?action=health to see available actions'
            })

    except Exception as e:
        print(f"Unhandled error: {str(e)}")
        import traceback
        traceback.print_exc()
        return simple_response(500, {
            'error': 'Internal server error',
            'message': str(e)
        })
