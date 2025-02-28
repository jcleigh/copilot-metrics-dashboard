# Convert the sample seats data to DynamoDB format and load it
$seatsData = @{
    "Item" = @{
        "id" = @{ "S" = [Guid]::NewGuid().ToString() }
        "recordDate" = @{ "S" = "2024-06-24" }
        "data" = @{
            "M" = @{
                "total_seats" = @{ "N" = "30" }
                "assigned_seats" = @{ "N" = "24" }
                "pending_seats" = @{ "N" = "2" }
                "available_seats" = @{ "N" = "4" }
                "assignments" = @{
                    "L" = @(
                        @{
                            "M" = @{
                                "seat_id" = @{ "S" = "seat_001" }
                                "assignee" = @{ "S" = "user1@demo.com" }
                                "status" = @{ "S" = "active" }
                                "assignment_date" = @{ "S" = "2024-01-15" }
                                "last_activity_date" = @{ "S" = "2024-06-23" }
                            }
                        },
                        @{
                            "M" = @{
                                "seat_id" = @{ "S" = "seat_002" }
                                "assignee" = @{ "S" = "user2@demo.com" }
                                "status" = @{ "S" = "pending" }
                                "assignment_date" = @{ "S" = "2024-06-20" }
                                "last_activity_date" = @{ "NULL" = $true }
                            }
                        },
                        @{
                            "M" = @{
                                "seat_id" = @{ "S" = "seat_003" }
                                "assignee" = @{ "S" = "user3@demo.com" }
                                "status" = @{ "S" = "active" }
                                "assignment_date" = @{ "S" = "2024-03-01" }
                                "last_activity_date" = @{ "S" = "2024-06-24" }
                            }
                        }
                    )
                }
            }
        }
    }
}

# Convert to JSON and save to a temporary file
$seatsJson = ConvertTo-Json $seatsData -Depth 100
$tempFile = [System.IO.Path]::GetTempFileName()
Set-Content -Path $tempFile -Value $seatsJson

# Load the data into DynamoDB
aws dynamodb put-item `
    --table-name seats_history `
    --cli-input-json "$(Get-Content $tempFile)" `
    --endpoint-url http://localhost:8000

# Clean up temp file
Remove-Item $tempFile

Write-Host "Sample seats data loaded successfully into seats_history table"