"""
DYNAMODB TABLE SETUP SCRIPT FOR COMMERCIVE
===========================================
This script creates all required DynamoDB tables with proper indexes
Run this ONCE before deploying the Lambda function

Requirements:
- AWS CLI configured with appropriate credentials
- boto3 library installed: pip install boto3

Usage:
    python dynamodb-setup.py
"""

import boto3
import time
from botocore.exceptions import ClientError

AWS_REGION = "us-east-1"
TABLE_PREFIX = "commercive_"

dynamodb = boto3.client('dynamodb', region_name=AWS_REGION)

def create_table_if_not_exists(table_name, key_schema, attribute_definitions, global_secondary_indexes=None):
    """Create DynamoDB table if it doesn't exist"""
    try:
        # Check if table exists
        dynamodb.describe_table(TableName=table_name)
        print(f"✓ Table {table_name} already exists")
        return True
    except ClientError as e:
        if e.response['Error']['Code'] == 'ResourceNotFoundException':
            # Table doesn't exist, create it
            print(f"Creating table {table_name}...")

            params = {
                'TableName': table_name,
                'KeySchema': key_schema,
                'AttributeDefinitions': attribute_definitions,
                'BillingMode': 'PAY_PER_REQUEST',  # On-demand pricing
                'Tags': [
                    {'Key': 'Application', 'Value': 'Commercive'},
                    {'Key': 'Environment', 'Value': 'Production'}
                ]
            }

            if global_secondary_indexes:
                params['GlobalSecondaryIndexes'] = global_secondary_indexes

            dynamodb.create_table(**params)

            # Wait for table to be created
            waiter = dynamodb.get_waiter('table_exists')
            waiter.wait(TableName=table_name)

            print(f"✓ Table {table_name} created successfully")
            return True
        else:
            print(f"✗ Error checking table {table_name}: {str(e)}")
            return False

def setup_chat_conversations_table():
    """Create chat_conversations table"""
    table_name = f"{TABLE_PREFIX}chat_conversations"

    key_schema = [
        {'AttributeName': 'conversation_id', 'KeyType': 'HASH'}
    ]

    attribute_definitions = [
        {'AttributeName': 'conversation_id', 'AttributeType': 'S'},
        {'AttributeName': 'user_id', 'AttributeType': 'S'},
        {'AttributeName': 'status', 'AttributeType': 'S'},
        {'AttributeName': 'created_at', 'AttributeType': 'N'},
    ]

    global_secondary_indexes = [
        {
            'IndexName': 'user_id-created_at-index',
            'KeySchema': [
                {'AttributeName': 'user_id', 'KeyType': 'HASH'},
                {'AttributeName': 'created_at', 'KeyType': 'RANGE'}
            ],
            'Projection': {'ProjectionType': 'ALL'}
        },
        {
            'IndexName': 'status-created_at-index',
            'KeySchema': [
                {'AttributeName': 'status', 'KeyType': 'HASH'},
                {'AttributeName': 'created_at', 'KeyType': 'RANGE'}
            ],
            'Projection': {'ProjectionType': 'ALL'}
        }
    ]

    return create_table_if_not_exists(table_name, key_schema, attribute_definitions, global_secondary_indexes)

def setup_chat_messages_table():
    """Create chat_messages table"""
    table_name = f"{TABLE_PREFIX}chat_messages"

    key_schema = [
        {'AttributeName': 'message_id', 'KeyType': 'HASH'}
    ]

    attribute_definitions = [
        {'AttributeName': 'message_id', 'AttributeType': 'S'},
        {'AttributeName': 'conversation_id', 'AttributeType': 'S'},
        {'AttributeName': 'created_at', 'AttributeType': 'N'},
    ]

    global_secondary_indexes = [
        {
            'IndexName': 'conversation_id-created_at-index',
            'KeySchema': [
                {'AttributeName': 'conversation_id', 'KeyType': 'HASH'},
                {'AttributeName': 'created_at', 'KeyType': 'RANGE'}
            ],
            'Projection': {'ProjectionType': 'ALL'}
        }
    ]

    return create_table_if_not_exists(table_name, key_schema, attribute_definitions, global_secondary_indexes)

def setup_affiliate_links_table():
    """Create affiliate_links table"""
    table_name = f"{TABLE_PREFIX}affiliate_links"

    key_schema = [
        {'AttributeName': 'link_id', 'KeyType': 'HASH'}
    ]

    attribute_definitions = [
        {'AttributeName': 'link_id', 'AttributeType': 'S'},
        {'AttributeName': 'affiliate_id', 'AttributeType': 'S'},
        {'AttributeName': 'created_at', 'AttributeType': 'N'},
    ]

    global_secondary_indexes = [
        {
            'IndexName': 'affiliate_id-created_at-index',
            'KeySchema': [
                {'AttributeName': 'affiliate_id', 'KeyType': 'HASH'},
                {'AttributeName': 'created_at', 'KeyType': 'RANGE'}
            ],
            'Projection': {'ProjectionType': 'ALL'}
        }
    ]

    return create_table_if_not_exists(table_name, key_schema, attribute_definitions, global_secondary_indexes)

def setup_leads_table():
    """Create leads table"""
    table_name = f"{TABLE_PREFIX}leads"

    key_schema = [
        {'AttributeName': 'lead_id', 'KeyType': 'HASH'}
    ]

    attribute_definitions = [
        {'AttributeName': 'lead_id', 'AttributeType': 'S'},
        {'AttributeName': 'affiliate_id', 'AttributeType': 'S'},
        {'AttributeName': 'link_id', 'AttributeType': 'S'},
        {'AttributeName': 'status', 'AttributeType': 'S'},
        {'AttributeName': 'created_at', 'AttributeType': 'N'},
    ]

    global_secondary_indexes = [
        {
            'IndexName': 'affiliate_id-status-index',
            'KeySchema': [
                {'AttributeName': 'affiliate_id', 'KeyType': 'HASH'},
                {'AttributeName': 'status', 'KeyType': 'RANGE'}
            ],
            'Projection': {'ProjectionType': 'ALL'}
        },
        {
            'IndexName': 'status-created_at-index',
            'KeySchema': [
                {'AttributeName': 'status', 'KeyType': 'HASH'},
                {'AttributeName': 'created_at', 'KeyType': 'RANGE'}
            ],
            'Projection': {'ProjectionType': 'ALL'}
        },
        {
            'IndexName': 'link_id-created_at-index',
            'KeySchema': [
                {'AttributeName': 'link_id', 'KeyType': 'HASH'},
                {'AttributeName': 'created_at', 'KeyType': 'RANGE'}
            ],
            'Projection': {'ProjectionType': 'ALL'}
        }
    ]

    return create_table_if_not_exists(table_name, key_schema, attribute_definitions, global_secondary_indexes)

def setup_payments_table():
    """Create affiliate_payments table"""
    table_name = f"{TABLE_PREFIX}affiliate_payments"

    key_schema = [
        {'AttributeName': 'payment_id', 'KeyType': 'HASH'}
    ]

    attribute_definitions = [
        {'AttributeName': 'payment_id', 'AttributeType': 'S'},
        {'AttributeName': 'affiliate_id', 'AttributeType': 'S'},
        {'AttributeName': 'status', 'AttributeType': 'S'},
        {'AttributeName': 'created_at', 'AttributeType': 'N'},
    ]

    global_secondary_indexes = [
        {
            'IndexName': 'affiliate_id-created_at-index',
            'KeySchema': [
                {'AttributeName': 'affiliate_id', 'KeyType': 'HASH'},
                {'AttributeName': 'created_at', 'KeyType': 'RANGE'}
            ],
            'Projection': {'ProjectionType': 'ALL'}
        },
        {
            'IndexName': 'status-created_at-index',
            'KeySchema': [
                {'AttributeName': 'status', 'KeyType': 'HASH'},
                {'AttributeName': 'created_at', 'KeyType': 'RANGE'}
            ],
            'Projection': {'ProjectionType': 'ALL'}
        }
    ]

    return create_table_if_not_exists(table_name, key_schema, attribute_definitions, global_secondary_indexes)

def main():
    """Main setup function"""
    print("=" * 60)
    print("COMMERCIVE DYNAMODB TABLE SETUP")
    print("=" * 60)
    print(f"Region: {AWS_REGION}")
    print(f"Table Prefix: {TABLE_PREFIX}")
    print("=" * 60)
    print()

    tables = [
        ("Chat Conversations", setup_chat_conversations_table),
        ("Chat Messages", setup_chat_messages_table),
        ("Affiliate Links", setup_affiliate_links_table),
        ("Leads", setup_leads_table),
        ("Affiliate Payments", setup_payments_table),
    ]

    results = []
    for name, setup_func in tables:
        print(f"\n[{name}]")
        success = setup_func()
        results.append((name, success))
        time.sleep(1)  # Small delay between table creations

    print("\n" + "=" * 60)
    print("SETUP SUMMARY")
    print("=" * 60)
    for name, success in results:
        status = "✓ SUCCESS" if success else "✗ FAILED"
        print(f"{name:.<50} {status}")

    all_success = all(result[1] for result in results)

    if all_success:
        print("\n✓ All tables created successfully!")
        print("\nNext steps:")
        print("1. Deploy the Lambda function")
        print("2. Configure the Lambda Function URL in your frontend")
        print("3. Test the endpoints")
    else:
        print("\n✗ Some tables failed to create. Please check the errors above.")
        return 1

    return 0

if __name__ == "__main__":
    exit(main())
