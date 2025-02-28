# Convert the sample metrics data to DynamoDB format and load it
$metricsData = @{
    "Item" = @{
        "id" = @{ "S" = [Guid]::NewGuid().ToString() }
        "recordDate" = @{ "S" = "2024-06-24" }
        "data" = @{ 
            "M" = @{
                "total_active_users" = @{ "N" = "24" }
                "total_engaged_users" = @{ "N" = "20" }
                "copilot_ide_code_completions" = @{
                    "M" = @{
                        "total_engaged_users" = @{ "N" = "20" }
                        "languages" = @{
                            "L" = @(
                                @{ "M" = @{ "name" = @{ "S" = "python" }; "total_engaged_users" = @{ "N" = "10" } } },
                                @{ "M" = @{ "name" = @{ "S" = "ruby" }; "total_engaged_users" = @{ "N" = "10" } } }
                            )
                        }
                        "editors" = @{
                            "L" = @(
                                @{
                                    "M" = @{
                                        "name" = @{ "S" = "vscode" }
                                        "total_engaged_users" = @{ "N" = "13" }
                                        "models" = @{
                                            "L" = @(
                                                @{
                                                    "M" = @{
                                                        "name" = @{ "S" = "default" }
                                                        "is_custom_model" = @{ "BOOL" = $false }
                                                        "custom_model_training_date" = @{ "NULL" = $true }
                                                        "total_engaged_users" = @{ "N" = "13" }
                                                        "languages" = @{
                                                            "L" = @(
                                                                @{
                                                                    "M" = @{
                                                                        "name" = @{ "S" = "python" }
                                                                        "total_engaged_users" = @{ "N" = "6" }
                                                                        "total_code_suggestions" = @{ "N" = "249" }
                                                                        "total_code_acceptances" = @{ "N" = "123" }
                                                                        "total_code_lines_suggested" = @{ "N" = "225" }
                                                                        "total_code_lines_accepted" = @{ "N" = "135" }
                                                                    }
                                                                },
                                                                @{
                                                                    "M" = @{
                                                                        "name" = @{ "S" = "ruby" }
                                                                        "total_engaged_users" = @{ "N" = "7" }
                                                                        "total_code_suggestions" = @{ "N" = "496" }
                                                                        "total_code_acceptances" = @{ "N" = "253" }
                                                                        "total_code_lines_suggested" = @{ "N" = "520" }
                                                                        "total_code_lines_accepted" = @{ "N" = "270" }
                                                                    }
                                                                }
                                                            )
                                                        }
                                                    }
                                                }
                                            )
                                        }
                                    }
                                },
                                @{
                                    "M" = @{
                                        "name" = @{ "S" = "neovim" }
                                        "total_engaged_users" = @{ "N" = "7" }
                                        "models" = @{
                                            "L" = @(
                                                @{
                                                    "M" = @{
                                                        "name" = @{ "S" = "a-custom-model" }
                                                        "is_custom_model" = @{ "BOOL" = $true }
                                                        "custom_model_training_date" = @{ "S" = "2024-02-01" }
                                                        "total_engaged_users" = @{ "N" = "4" }
                                                        "languages" = @{
                                                            "L" = @(
                                                                @{
                                                                    "M" = @{
                                                                        "name" = @{ "S" = "typescript" }
                                                                        "total_engaged_users" = @{ "N" = "3" }
                                                                        "total_code_suggestions" = @{ "N" = "112" }
                                                                        "total_code_acceptances" = @{ "N" = "56" }
                                                                        "total_code_lines_suggested" = @{ "N" = "143" }
                                                                        "total_code_lines_accepted" = @{ "N" = "61" }
                                                                    }
                                                                },
                                                                @{
                                                                    "M" = @{
                                                                        "name" = @{ "S" = "go" }
                                                                        "total_engaged_users" = @{ "N" = "4" }
                                                                        "total_code_suggestions" = @{ "N" = "132" }
                                                                        "total_code_acceptances" = @{ "N" = "67" }
                                                                        "total_code_lines_suggested" = @{ "N" = "154" }
                                                                        "total_code_lines_accepted" = @{ "N" = "72" }
                                                                    }
                                                                }
                                                            )
                                                        }
                                                    }
                                                }
                                            )
                                        }
                                    }
                                }
                            )
                        }
                    }
                }
                "copilot_ide_chat" = @{
                    "M" = @{
                        "total_engaged_users" = @{ "N" = "13" }
                        "editors" = @{
                            "L" = @(
                                @{
                                    "M" = @{
                                        "name" = @{ "S" = "vscode" }
                                        "total_engaged_users" = @{ "N" = "13" }
                                        "models" = @{
                                            "L" = @(
                                                @{
                                                    "M" = @{
                                                        "name" = @{ "S" = "default" }
                                                        "is_custom_model" = @{ "BOOL" = $false }
                                                        "custom_model_training_date" = @{ "NULL" = $true }
                                                        "total_engaged_users" = @{ "N" = "12" }
                                                        "total_chats" = @{ "N" = "45" }
                                                        "total_chat_insertion_events" = @{ "N" = "12" }
                                                        "total_chat_copy_events" = @{ "N" = "16" }
                                                    }
                                                },
                                                @{
                                                    "M" = @{
                                                        "name" = @{ "S" = "a-custom-model" }
                                                        "is_custom_model" = @{ "BOOL" = $true }
                                                        "custom_model_training_date" = @{ "S" = "2024-02-01" }
                                                        "total_engaged_users" = @{ "N" = "1" }
                                                        "total_chats" = @{ "N" = "10" }
                                                        "total_chat_insertion_events" = @{ "N" = "11" }
                                                        "total_chat_copy_events" = @{ "N" = "3" }
                                                    }
                                                }
                                            )
                                        }
                                    }
                                }
                            )
                        }
                    }
                }
                "copilot_dotcom_chat" = @{
                    "M" = @{
                        "total_engaged_users" = @{ "N" = "14" }
                        "models" = @{
                            "L" = @(
                                @{
                                    "M" = @{
                                        "name" = @{ "S" = "default" }
                                        "is_custom_model" = @{ "BOOL" = $false }
                                        "custom_model_training_date" = @{ "NULL" = $true }
                                        "total_engaged_users" = @{ "N" = "14" }
                                        "total_chats" = @{ "N" = "38" }
                                    }
                                }
                            )
                        }
                    }
                }
                "copilot_dotcom_pull_requests" = @{
                    "M" = @{
                        "total_engaged_users" = @{ "N" = "12" }
                        "repositories" = @{
                            "L" = @(
                                @{
                                    "M" = @{
                                        "name" = @{ "S" = "demo/repo1" }
                                        "total_engaged_users" = @{ "N" = "8" }
                                        "models" = @{
                                            "L" = @(
                                                @{
                                                    "M" = @{
                                                        "name" = @{ "S" = "default" }
                                                        "is_custom_model" = @{ "BOOL" = $false }
                                                        "custom_model_training_date" = @{ "NULL" = $true }
                                                        "total_pr_summaries_created" = @{ "N" = "6" }
                                                        "total_engaged_users" = @{ "N" = "8" }
                                                    }
                                                }
                                            )
                                        }
                                    }
                                },
                                @{
                                    "M" = @{
                                        "name" = @{ "S" = "demo/repo2" }
                                        "total_engaged_users" = @{ "N" = "4" }
                                        "models" = @{
                                            "L" = @(
                                                @{
                                                    "M" = @{
                                                        "name" = @{ "S" = "a-custom-model" }
                                                        "is_custom_model" = @{ "BOOL" = $true }
                                                        "custom_model_training_date" = @{ "S" = "2024-02-01" }
                                                        "total_pr_summaries_created" = @{ "N" = "10" }
                                                        "total_engaged_users" = @{ "N" = "4" }
                                                    }
                                                }
                                            )
                                        }
                                    }
                                }
                            )
                        }
                    }
                }
            }
        }
    }
}

# Convert to JSON and save to a temporary file
$metricsJson = ConvertTo-Json $metricsData -Depth 100
$tempFile = [System.IO.Path]::GetTempFileName()
Set-Content -Path $tempFile -Value $metricsJson

# Load the data into DynamoDB
aws dynamodb put-item `
    --table-name metrics_history `
    --cli-input-json "$(Get-Content $tempFile)" `
    --endpoint-url http://localhost:8000

# Clean up temp file
Remove-Item $tempFile

Write-Host "Sample data loaded successfully into metrics_history table"