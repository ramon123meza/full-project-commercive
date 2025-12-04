#!/usr/bin/env python3
"""
DynamoDB Tables Setup Script - Phase 2
=======================================
This script creates additional DynamoDB tables for the Commercive Dashboard.
These tables support the enhanced affiliate CRM system with:
- Affiliate orders tracking
- Commission calculations (per-order and percentage-based)
- CSV import history
- Affiliate configurations

Run this script after setup_database_1.py (dynamodb-setup.py)

Usage:
    python setup_database_2.py

Requirements:
    - boto3 installed
    - AWS credentials configured (via environment variables or ~/.aws/credentials)
    - IAM permissions for DynamoDB table creation

Environment Variables (optional):
    AWS_DEFAULT_REGION: AWS region (default: us-east-1)
    AWS_ACCESS_KEY_ID: AWS access key
    AWS_SECRET_ACCESS_KEY: AWS secret key
"""

import boto3
import time
import sys
from botocore.exceptions import ClientError

# Configuration
AWS_REGION = "us-east-1"
TABLE_PREFIX = "commercive_"

# Table definitions
TABLES = [
    {
        "TableName": f"{TABLE_PREFIX}affiliate_orders",
        "KeySchema": [
            {"AttributeName": "order_id", "KeyType": "HASH"},
        ],
        "AttributeDefinitions": [
            {"AttributeName": "order_id", "AttributeType": "S"},
            {"AttributeName": "affiliate_id", "AttributeType": "S"},
            {"AttributeName": "customer_code", "AttributeType": "S"},
            {"AttributeName": "order_date", "AttributeType": "S"},
            {"AttributeName": "created_at", "AttributeType": "S"},
        ],
        "GlobalSecondaryIndexes": [
            {
                "IndexName": "affiliate_id-order_date-index",
                "KeySchema": [
                    {"AttributeName": "affiliate_id", "KeyType": "HASH"},
                    {"AttributeName": "order_date", "KeyType": "RANGE"},
                ],
                "Projection": {"ProjectionType": "ALL"},
            },
            {
                "IndexName": "customer_code-order_date-index",
                "KeySchema": [
                    {"AttributeName": "customer_code", "KeyType": "HASH"},
                    {"AttributeName": "order_date", "KeyType": "RANGE"},
                ],
                "Projection": {"ProjectionType": "ALL"},
            },
            {
                "IndexName": "affiliate_id-created_at-index",
                "KeySchema": [
                    {"AttributeName": "affiliate_id", "KeyType": "HASH"},
                    {"AttributeName": "created_at", "KeyType": "RANGE"},
                ],
                "Projection": {"ProjectionType": "ALL"},
            },
        ],
        "BillingMode": "PAY_PER_REQUEST",
        "Tags": [
            {"Key": "Application", "Value": "Commercive"},
            {"Key": "Environment", "Value": "Production"},
            {"Key": "Purpose", "Value": "Affiliate order tracking"},
        ],
    },
    {
        "TableName": f"{TABLE_PREFIX}affiliate_configs",
        "KeySchema": [
            {"AttributeName": "config_id", "KeyType": "HASH"},
        ],
        "AttributeDefinitions": [
            {"AttributeName": "config_id", "AttributeType": "S"},
            {"AttributeName": "affiliate_id", "AttributeType": "S"},
            {"AttributeName": "customer_code", "AttributeType": "S"},
        ],
        "GlobalSecondaryIndexes": [
            {
                "IndexName": "affiliate_id-index",
                "KeySchema": [
                    {"AttributeName": "affiliate_id", "KeyType": "HASH"},
                ],
                "Projection": {"ProjectionType": "ALL"},
            },
            {
                "IndexName": "customer_code-index",
                "KeySchema": [
                    {"AttributeName": "customer_code", "KeyType": "HASH"},
                ],
                "Projection": {"ProjectionType": "ALL"},
            },
        ],
        "BillingMode": "PAY_PER_REQUEST",
        "Tags": [
            {"Key": "Application", "Value": "Commercive"},
            {"Key": "Environment", "Value": "Production"},
            {"Key": "Purpose", "Value": "Affiliate commission configuration"},
        ],
    },
    {
        "TableName": f"{TABLE_PREFIX}csv_imports",
        "KeySchema": [
            {"AttributeName": "import_id", "KeyType": "HASH"},
        ],
        "AttributeDefinitions": [
            {"AttributeName": "import_id", "AttributeType": "S"},
            {"AttributeName": "imported_by", "AttributeType": "S"},
            {"AttributeName": "created_at", "AttributeType": "S"},
        ],
        "GlobalSecondaryIndexes": [
            {
                "IndexName": "imported_by-created_at-index",
                "KeySchema": [
                    {"AttributeName": "imported_by", "KeyType": "HASH"},
                    {"AttributeName": "created_at", "KeyType": "RANGE"},
                ],
                "Projection": {"ProjectionType": "ALL"},
            },
        ],
        "BillingMode": "PAY_PER_REQUEST",
        "Tags": [
            {"Key": "Application", "Value": "Commercive"},
            {"Key": "Environment", "Value": "Production"},
            {"Key": "Purpose", "Value": "CSV import history tracking"},
        ],
    },
    {
        "TableName": f"{TABLE_PREFIX}affiliate_summaries",
        "KeySchema": [
            {"AttributeName": "affiliate_id", "KeyType": "HASH"},
            {"AttributeName": "period", "KeyType": "RANGE"},
        ],
        "AttributeDefinitions": [
            {"AttributeName": "affiliate_id", "AttributeType": "S"},
            {"AttributeName": "period", "AttributeType": "S"},
        ],
        "BillingMode": "PAY_PER_REQUEST",
        "Tags": [
            {"Key": "Application", "Value": "Commercive"},
            {"Key": "Environment", "Value": "Production"},
            {"Key": "Purpose", "Value": "Aggregated affiliate commission summaries"},
        ],
    },
]


def create_dynamodb_client():
    """Create DynamoDB client with region configuration."""
    return boto3.client("dynamodb", region_name=AWS_REGION)


def table_exists(dynamodb, table_name):
    """Check if a DynamoDB table exists."""
    try:
        dynamodb.describe_table(TableName=table_name)
        return True
    except ClientError as e:
        if e.response["Error"]["Code"] == "ResourceNotFoundException":
            return False
        raise


def wait_for_table_active(dynamodb, table_name, max_wait=120):
    """Wait for a table to become active."""
    print(f"  Waiting for table {table_name} to become active...")
    waited = 0
    while waited < max_wait:
        try:
            response = dynamodb.describe_table(TableName=table_name)
            status = response["Table"]["TableStatus"]
            if status == "ACTIVE":
                print(f"  ✓ Table {table_name} is now active")
                return True
            print(f"  Status: {status}, waiting...")
            time.sleep(5)
            waited += 5
        except ClientError:
            time.sleep(5)
            waited += 5
    print(f"  ✗ Timeout waiting for table {table_name}")
    return False


def create_table(dynamodb, table_config):
    """Create a DynamoDB table from configuration."""
    table_name = table_config["TableName"]

    if table_exists(dynamodb, table_name):
        print(f"  ⚠ Table {table_name} already exists, skipping...")
        return True

    print(f"  Creating table {table_name}...")

    try:
        # Build create_table parameters
        params = {
            "TableName": table_name,
            "KeySchema": table_config["KeySchema"],
            "AttributeDefinitions": table_config["AttributeDefinitions"],
            "BillingMode": table_config.get("BillingMode", "PAY_PER_REQUEST"),
        }

        # Add GSIs if present
        if "GlobalSecondaryIndexes" in table_config:
            params["GlobalSecondaryIndexes"] = table_config["GlobalSecondaryIndexes"]

        # Add tags if present
        if "Tags" in table_config:
            params["Tags"] = table_config["Tags"]

        dynamodb.create_table(**params)

        # Wait for table to be active
        return wait_for_table_active(dynamodb, table_name)

    except ClientError as e:
        print(f"  ✗ Error creating table {table_name}: {e.response['Error']['Message']}")
        return False


def print_table_schema(table_config):
    """Print the schema for a table configuration."""
    print(f"\n  Table: {table_config['TableName']}")
    print("  " + "-" * 50)

    print("  Primary Key:")
    for key in table_config["KeySchema"]:
        print(f"    - {key['AttributeName']} ({key['KeyType']})")

    if "GlobalSecondaryIndexes" in table_config:
        print("  Global Secondary Indexes:")
        for gsi in table_config["GlobalSecondaryIndexes"]:
            print(f"    - {gsi['IndexName']}")
            for key in gsi["KeySchema"]:
                print(f"      - {key['AttributeName']} ({key['KeyType']})")


def main():
    """Main function to create all tables."""
    print("=" * 60)
    print("Commercive DynamoDB Setup - Phase 2")
    print("=" * 60)
    print(f"\nRegion: {AWS_REGION}")
    print(f"Tables to create: {len(TABLES)}\n")

    # Print table schemas
    print("Table Schemas:")
    for table_config in TABLES:
        print_table_schema(table_config)

    print("\n" + "=" * 60)
    print("Creating Tables")
    print("=" * 60 + "\n")

    # Create DynamoDB client
    try:
        dynamodb = create_dynamodb_client()
        # Test connection
        dynamodb.list_tables()
        print("✓ Connected to DynamoDB\n")
    except Exception as e:
        print(f"✗ Failed to connect to DynamoDB: {e}")
        print("\nMake sure your AWS credentials are configured correctly:")
        print("  - AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables")
        print("  - Or ~/.aws/credentials file")
        sys.exit(1)

    # Create tables
    results = {"success": [], "failed": [], "skipped": []}

    for table_config in TABLES:
        table_name = table_config["TableName"]
        print(f"\nProcessing: {table_name}")

        if table_exists(dynamodb, table_name):
            results["skipped"].append(table_name)
            print(f"  ⚠ Skipped (already exists)")
        elif create_table(dynamodb, table_config):
            results["success"].append(table_name)
        else:
            results["failed"].append(table_name)

    # Print summary
    print("\n" + "=" * 60)
    print("Summary")
    print("=" * 60)

    print(f"\n✓ Created: {len(results['success'])}")
    for name in results["success"]:
        print(f"    - {name}")

    print(f"\n⚠ Skipped: {len(results['skipped'])}")
    for name in results["skipped"]:
        print(f"    - {name}")

    if results["failed"]:
        print(f"\n✗ Failed: {len(results['failed'])}")
        for name in results["failed"]:
            print(f"    - {name}")
        sys.exit(1)

    print("\n" + "=" * 60)
    print("Setup Complete!")
    print("=" * 60)

    # Print expected attribute structure
    print("\n" + "=" * 60)
    print("Expected Attribute Structures")
    print("=" * 60)

    print("""
commercive_affiliate_orders:
    - order_id (S): Unique order identifier (UUID)
    - affiliate_id (S): Affiliate's ID (AFF-XXXXXXXX)
    - customer_code (S): Customer code/identifier (not store name for privacy)
    - store_name (S): Store name (hidden from affiliates)
    - order_date (S): Order date (YYYY-MM-DD)
    - order_number (S): Original order number
    - order_quantity (N): Number of items in order
    - invoice_total (N): Total order amount
    - commission_type (S): 'per_order' or 'percentage'
    - commission_rate (N): Rate value (e.g., 1.00 for $1 or 0.01 for 1%)
    - commission_earned (N): Calculated commission amount
    - status (S): 'pending', 'approved', 'paid'
    - created_at (S): ISO 8601 timestamp
    - updated_at (S): ISO 8601 timestamp

commercive_affiliate_configs:
    - config_id (S): Unique config ID (affiliate_id:customer_code)
    - affiliate_id (S): Affiliate's ID
    - customer_code (S): Customer code/identifier
    - commission_type (S): 'per_order' or 'percentage'
    - commission_rate (N): Rate value
    - is_active (BOOL): Whether config is active
    - created_at (S): ISO 8601 timestamp
    - updated_at (S): ISO 8601 timestamp

commercive_csv_imports:
    - import_id (S): Unique import ID (UUID)
    - imported_by (S): User ID who performed import
    - file_name (S): Original file name
    - records_count (N): Number of records imported
    - records_success (N): Successfully processed records
    - records_failed (N): Failed records
    - status (S): 'processing', 'completed', 'failed'
    - error_details (S): JSON string of errors if any
    - created_at (S): ISO 8601 timestamp
    - completed_at (S): ISO 8601 timestamp

commercive_affiliate_summaries:
    - affiliate_id (S): Affiliate's ID
    - period (S): Period identifier (YYYY-MM for monthly, YYYY for yearly, 'all' for lifetime)
    - total_orders (N): Total number of orders
    - total_revenue (N): Total revenue from orders
    - total_commission (N): Total commission earned
    - average_order_value (N): Average order value
    - unique_customers (N): Number of unique customers
    - updated_at (S): ISO 8601 timestamp
""")


if __name__ == "__main__":
    main()
