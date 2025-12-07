#!/usr/bin/env python3
"""
COMMERCIVE USER PREFERENCES DATABASE SETUP
==========================================
This script creates the DynamoDB table for user preferences including:
- Selected store per user
- Date range selections per user
- Cross-device persistence

Run this script locally with your AWS credentials to create the table.

Usage:
    python setup_user_preferences_db.py

Prerequisites:
    - AWS CLI configured with credentials OR
    - Environment variables: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
    - boto3 installed: pip install boto3
"""

import boto3
import sys
import time
from botocore.exceptions import ClientError

# Configuration
AWS_REGION = "us-east-1"
TABLE_PREFIX = "commercive_"

# Table definitions
TABLES_TO_CREATE = [
    {
        "name": f"{TABLE_PREFIX}user_preferences",
        "description": "Stores user preferences like selected store, date range for cross-device persistence",
        "key_schema": [
            {"AttributeName": "user_id", "KeyType": "HASH"}  # Partition key
        ],
        "attribute_definitions": [
            {"AttributeName": "user_id", "AttributeType": "S"}
        ],
        "gsi": []  # No GSI needed - we only query by user_id
    }
]


def create_dynamodb_client():
    """Create DynamoDB client with configured credentials"""
    try:
        client = boto3.client('dynamodb', region_name=AWS_REGION)
        resource = boto3.resource('dynamodb', region_name=AWS_REGION)

        # Test connection by listing tables
        client.list_tables()
        print(f"✅ Successfully connected to DynamoDB in {AWS_REGION}")
        return client, resource
    except ClientError as e:
        print(f"❌ Failed to connect to AWS: {e}")
        print("\nPlease ensure your AWS credentials are configured:")
        print("  Option 1: Run 'aws configure' to set up AWS CLI")
        print("  Option 2: Set environment variables:")
        print("    export AWS_ACCESS_KEY_ID=your_access_key")
        print("    export AWS_SECRET_ACCESS_KEY=your_secret_key")
        sys.exit(1)


def table_exists(client, table_name):
    """Check if a table already exists"""
    try:
        client.describe_table(TableName=table_name)
        return True
    except ClientError as e:
        if e.response['Error']['Code'] == 'ResourceNotFoundException':
            return False
        raise


def wait_for_table_active(client, table_name, max_wait=60):
    """Wait for table to become active"""
    print(f"  Waiting for table {table_name} to become active...")
    waited = 0
    while waited < max_wait:
        try:
            response = client.describe_table(TableName=table_name)
            status = response['Table']['TableStatus']
            if status == 'ACTIVE':
                return True
            print(f"    Status: {status}, waiting...")
            time.sleep(2)
            waited += 2
        except ClientError:
            time.sleep(2)
            waited += 2
    return False


def create_table(client, table_config):
    """Create a single DynamoDB table"""
    table_name = table_config["name"]

    if table_exists(client, table_name):
        print(f"⚠️  Table {table_name} already exists, skipping...")
        return True

    print(f"\n📦 Creating table: {table_name}")
    print(f"   Description: {table_config['description']}")

    create_params = {
        "TableName": table_name,
        "KeySchema": table_config["key_schema"],
        "AttributeDefinitions": table_config["attribute_definitions"],
        "BillingMode": "PAY_PER_REQUEST"  # On-demand pricing
    }

    # Add GSI if defined
    if table_config.get("gsi"):
        create_params["GlobalSecondaryIndexes"] = table_config["gsi"]
        # Need to add GSI attribute definitions
        for gsi in table_config["gsi"]:
            for key in gsi["KeySchema"]:
                attr_name = key["AttributeName"]
                # Check if already in attribute definitions
                if not any(ad["AttributeName"] == attr_name for ad in create_params["AttributeDefinitions"]):
                    create_params["AttributeDefinitions"].append({
                        "AttributeName": attr_name,
                        "AttributeType": "S"
                    })

    try:
        client.create_table(**create_params)

        if wait_for_table_active(client, table_name):
            print(f"✅ Table {table_name} created successfully!")
            return True
        else:
            print(f"❌ Timeout waiting for table {table_name} to become active")
            return False
    except ClientError as e:
        print(f"❌ Failed to create table {table_name}: {e}")
        return False


def insert_sample_data(resource, table_name):
    """Insert sample data for testing"""
    table = resource.Table(table_name)

    # Sample user preferences record
    sample_data = {
        "user_id": "sample-user-id-12345",
        "selected_store_id": 1,
        "selected_store_url": "sample-store.myshopify.com",
        "selected_store_name": "Sample Store",
        "date_range_start": "2024-12-01T00:00:00.000Z",
        "date_range_end": "2024-12-07T23:59:59.999Z",
        "created_at": int(time.time() * 1000),
        "updated_at": int(time.time() * 1000)
    }

    try:
        table.put_item(Item=sample_data)
        print(f"📝 Inserted sample data into {table_name}")

        # Immediately delete sample data
        table.delete_item(Key={"user_id": "sample-user-id-12345"})
        print(f"🗑️  Removed sample data from {table_name}")
    except ClientError as e:
        print(f"⚠️  Could not insert/remove sample data: {e}")


def print_table_schema():
    """Print the expected table schema for documentation"""
    print("\n" + "="*60)
    print("USER PREFERENCES TABLE SCHEMA")
    print("="*60)
    print("""
Table: commercive_user_preferences
----------------------------------
Primary Key:
  - user_id (String, Partition Key) - The Supabase user ID

Attributes:
  - user_id (String) - Unique user identifier from Supabase auth
  - selected_store_id (Number) - ID of the selected store
  - selected_store_url (String) - URL of the selected store
  - selected_store_name (String) - Name of the selected store
  - date_range_start (String) - ISO date string for start of date range
  - date_range_end (String) - ISO date string for end of date range
  - created_at (Number) - Timestamp when record was created
  - updated_at (Number) - Timestamp when record was last updated

Example Record:
{
  "user_id": "d92e5195-24a2-47dd-8182-48d58465ac28",
  "selected_store_id": 1,
  "selected_store_url": "mystore.myshopify.com",
  "selected_store_name": "My Shopify Store",
  "date_range_start": "2024-12-01T00:00:00.000Z",
  "date_range_end": "2024-12-07T23:59:59.999Z",
  "created_at": 1733400000000,
  "updated_at": 1733400000000
}

Lambda Endpoints Added:
  - GET  ?action=preferences/get&user_id=xxx
  - POST ?action=preferences/set { user_id, selected_store_id, ... }
""")


def main():
    print("="*60)
    print("COMMERCIVE USER PREFERENCES DATABASE SETUP")
    print("="*60)
    print(f"\nRegion: {AWS_REGION}")
    print(f"Table prefix: {TABLE_PREFIX}")
    print()

    # Connect to DynamoDB
    client, resource = create_dynamodb_client()

    # Create tables
    success_count = 0
    for table_config in TABLES_TO_CREATE:
        if create_table(client, table_config):
            success_count += 1
            # Insert and remove sample data to verify write access
            insert_sample_data(resource, table_config["name"])

    # Print summary
    print("\n" + "="*60)
    print("SETUP SUMMARY")
    print("="*60)
    print(f"\nTables created: {success_count}/{len(TABLES_TO_CREATE)}")

    if success_count == len(TABLES_TO_CREATE):
        print("\n✅ All tables created successfully!")
        print_table_schema()
        print("\n📋 Next Steps:")
        print("1. Update your Lambda function with the new endpoints (see lambda/lambda_function.py)")
        print("2. Deploy the updated Lambda function to AWS")
        print("3. The frontend will automatically use the new persistence")
    else:
        print("\n⚠️  Some tables failed to create. Check the errors above.")
        sys.exit(1)


if __name__ == "__main__":
    main()
