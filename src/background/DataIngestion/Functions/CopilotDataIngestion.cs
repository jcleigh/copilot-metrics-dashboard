using Amazon.Lambda.Core;
using Amazon.Lambda.DynamoDBEvents;
using Microsoft.Extensions.Logging;
using Microsoft.CopilotDashboard.DataIngestion.Models;
using Microsoft.CopilotDashboard.DataIngestion.Services;

namespace Microsoft.CopilotDashboard.DataIngestion.Functions;

public class CopilotDataIngestion
{
    private readonly ILogger _logger;
    private readonly GitHubCopilotUsageClient usageClient;

    public CopilotDataIngestion(ILoggerFactory loggerFactory, GitHubCopilotUsageClient usageClient)
    {
        _logger = loggerFactory.CreateLogger<CopilotDataIngestion>();
        this.usageClient = usageClient;
    }

    [LambdaFunction]
    public async Task<List<CopilotUsage>> Run(DynamoDBEvent dynamoEvent)
    {
        _logger.LogInformation($"GitHubCopilotDataIngestion DynamoDB event function executed at: {DateTime.Now}");

        List<CopilotUsage> usage;

        var scope = Environment.GetEnvironmentVariable("GITHUB_API_SCOPE");
        if (!string.IsNullOrWhiteSpace(scope) && scope == "enterprise")
        {
            _logger.LogInformation("Fetching GitHub Copilot usage metrics for enterprise");
            usage = await usageClient.GetCopilotMetricsForEnterpriseAsync();
        }
        else
        {
            _logger.LogInformation("Fetching GitHub Copilot usage metrics for organization");
            usage = await usageClient.GetCopilotMetricsForOrgsAsync();
        }

        _logger.LogInformation($"Finished ingestion. DynamoDB event processed at: {DateTime.Now}");

        return usage;
    }
}
