using Amazon.Lambda.Core;
using Amazon.Lambda.DynamoDBEvents;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.CopilotDashboard.DataIngestion.Models;
using Microsoft.CopilotDashboard.DataIngestion.Services;

namespace Microsoft.CopilotDashboard.DataIngestion.Functions;

public class CopilotMetricsIngestion
{
    private readonly ILogger _logger;
    private readonly GitHubCopilotMetricsClient _metricsClient;
    private readonly IOptions<GithubMetricsApiOptions> _options;

    public CopilotMetricsIngestion(
        ILogger<CopilotMetricsIngestion> logger,
        GitHubCopilotMetricsClient metricsClient,
        IOptions<GithubMetricsApiOptions> options)
    {
        _logger = logger;
        _metricsClient = metricsClient;
        _options = options;
    }

    [LambdaFunction]
    public async Task<List<Metrics>> Run(DynamoDBEvent dynamoEvent)
    {
        _logger.LogInformation($"GitHubCopilotMetricsIngestion DynamoDB event function executed at: {DateTime.Now}");
        bool.TryParse(Environment.GetEnvironmentVariable("USE_METRICS_API"), out var useMetricsApi);
        _logger.LogInformation($"USE_METRICS_API: {useMetricsApi}");
        if (!useMetricsApi) return [];

        var metrics = new List<Metrics>();

        metrics.AddRange(await ExtractMetrics());

        var teams = _options.Value.Teams;
        if (teams != null && teams.Any())
        {
            foreach (var team in teams)
            {
                metrics.AddRange(await ExtractMetrics(team));
            }
        }
        else
        {
            metrics.AddRange(await ExtractMetrics());
        }

        _logger.LogInformation($"Finished ingestion. DynamoDB event processed at: {DateTime.Now}");
        _logger.LogInformation($"Metrics count: {metrics.Count}");
        return metrics;
    }

    private async Task<Metrics[]> ExtractMetrics(string? team = null)
    {
        if (_options.Value.UseTestData)
        {
            return await LoadTestData(team);
        }

        var scope = Environment.GetEnvironmentVariable("GITHUB_API_SCOPE");
        if (!string.IsNullOrWhiteSpace(scope) && scope == "enterprise")
        {
            _logger.LogInformation("Fetching GitHub Copilot usage metrics for enterprise");
            return await _metricsClient.GetCopilotMetricsForEnterpriseAsync(team);
        }

        _logger.LogInformation("Fetching GitHub Copilot usage metrics for organization");
        return await _metricsClient.GetCopilotMetricsForOrganizationAsync(team);
    }

    private ValueTask<Metrics[]> LoadTestData(string? teamName)
    {
        return _metricsClient.GetTestCoPilotMetrics(teamName);
    }
}
