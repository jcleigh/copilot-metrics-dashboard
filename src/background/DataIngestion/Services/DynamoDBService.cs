using System.Text.Json;
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.DocumentModel;
using Amazon.DynamoDBv2.Model;
using Microsoft.CopilotDashboard.DataIngestion.Models;
using Microsoft.Extensions.Logging;

namespace Microsoft.CopilotDashboard.DataIngestion.Services;

public class DynamoDBService
{
    private readonly IAmazonDynamoDB _dynamoDbClient;
    private readonly ILogger<DynamoDBService> _logger;
    private readonly string _metricsTableName = "metrics_history";
    private readonly string _seatsTableName = "seats_history";

    public DynamoDBService(IAmazonDynamoDB dynamoDbClient, ILogger<DynamoDBService> logger)
    {
        _dynamoDbClient = dynamoDbClient;
        _logger = logger;
    }

    public async Task SaveMetricsAsync(List<Metrics> metrics)
    {
        if (metrics == null || !metrics.Any())
        {
            _logger.LogInformation("No metrics to save to DynamoDB");
            return;
        }

        _logger.LogInformation($"Saving {metrics.Count} metrics to DynamoDB");

        foreach (var metric in metrics)
        {
            try
            {
                // Convert to document
                var item = Document.FromJson(JsonSerializer.Serialize(metric));
                var itemAsAttributes = item.ToAttributeMap();

                // Save to DynamoDB
                var request = new PutItemRequest
                {
                    TableName = _metricsTableName,
                    Item = itemAsAttributes
                };

                await _dynamoDbClient.PutItemAsync(request);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error saving metric to DynamoDB: {ex.Message}");
            }
        }
    }

    public async Task SaveSeatsAsync(CopilotAssignedSeats seats)
    {
        if (seats == null)
        {
            _logger.LogInformation("No seats to save to DynamoDB");
            return;
        }

        _logger.LogInformation("Saving seats to DynamoDB");

        try
        {
            // Convert to document
            var item = Document.FromJson(JsonSerializer.Serialize(seats));
            var itemAsAttributes = item.ToAttributeMap();

            // Save to DynamoDB
            var request = new PutItemRequest
            {
                TableName = _seatsTableName,
                Item = itemAsAttributes
            };

            await _dynamoDbClient.PutItemAsync(request);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error saving seats to DynamoDB: {ex.Message}");
        }
    }
}