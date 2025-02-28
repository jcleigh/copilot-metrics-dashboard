# Delete tables (run as needed)
# aws dynamodb delete-table --table-name metrics_history --endpoint-url http://localhost:8000
# aws dynamodb delete-table --table-name seats_history --endpoint-url http://localhost:8000

# Create metrics_history table
aws dynamodb create-table `
    --table-name metrics_history `
    --attribute-definitions `
        AttributeName=id,AttributeType=S `
        AttributeName=recordDate,AttributeType=S `
    --key-schema `
        AttributeName=id,KeyType=HASH `
    --global-secondary-indexes file://dateindex-gsi.json `
    --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 `
    --endpoint-url http://localhost:8000

# Create seats_history table
aws dynamodb create-table `
    --table-name seats_history `
    --attribute-definitions `
        AttributeName=id,AttributeType=S `
        AttributeName=recordDate,AttributeType=S `
    --key-schema `
        AttributeName=id,KeyType=HASH `
    --global-secondary-indexes file://dateindex-gsi.json `
    --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 `
    --endpoint-url http://localhost:8000

# List tables
aws dynamodb list-tables --endpoint-url http://localhost:8000