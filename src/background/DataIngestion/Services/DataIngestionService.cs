using Microsoft.CopilotDashboard.DataIngestion.Models;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Amazon.SecretsManager;
using Amazon.SecretsManager.Model;
using System.Text.Json;

namespace Microsoft.CopilotDashboard.DataIngestion.Services;

public class DataIngestionService : BackgroundService
{
    private readonly ILogger<DataIngestionService> _logger;
    private readonly GitHubCopilotMetricsClient _metricsClient;
    private readonly GitHubCopilotSeatsClient _seatsClient;
    private readonly DynamoDBService _dynamoDBService;
    private readonly IOptions<GithubMetricsApiOptions> _options;
    private readonly IAmazonSecretsManager _secretsManager;
    private const string FMG_ORGANIZATION = "FMGSuite";

    public DataIngestionService(
        ILogger<DataIngestionService> logger,
        GitHubCopilotMetricsClient metricsClient,
        GitHubCopilotSeatsClient seatsClient,
        DynamoDBService dynamoDBService,
        IOptions<GithubMetricsApiOptions> options,
        IAmazonSecretsManager secretsManager = null)
    {
        _logger = logger;
        _metricsClient = metricsClient;
        _seatsClient = seatsClient;
        _dynamoDBService = dynamoDBService;
        _options = options;
        _secretsManager = secretsManager;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("DataIngestionService is starting at: {time}", DateTimeOffset.Now);
        
        try
        {
            await IngestMetricsAsync();
            await IngestSeatsAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred during data ingestion");
        }
        
        _logger.LogInformation("DataIngestionService completed at: {time}", DateTimeOffset.Now);
    }

    private async Task IngestMetricsAsync()
    {
        _logger.LogInformation("Starting GitHub Copilot metrics ingestion at: {time}", DateTimeOffset.Now);

        var metrics = new List<Metrics>();

        // Extract metrics for organization/enterprise
        metrics.AddRange(await ExtractMetrics());

        // Extract metrics for teams if configured
        var teams = _options.Value.Teams;
        if (teams != null && teams.Any())
        {
            foreach (var team in teams)
            {
                metrics.AddRange(await ExtractMetrics(team));
            }
        }

        _logger.LogInformation($"Metrics count: {metrics.Count}");
        
        // Save metrics to DynamoDB
        await _dynamoDBService.SaveMetricsAsync(metrics);
        
        _logger.LogInformation("Completed GitHub Copilot metrics ingestion at: {time}", DateTimeOffset.Now);
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
        return _metricsClient.GetTestCopilotMetrics(teamName);
    }

    private async Task IngestSeatsAsync()
    {
        _logger.LogInformation("Starting GitHub Copilot seats ingestion at: {time}", DateTimeOffset.Now);

        Boolean.TryParse(Environment.GetEnvironmentVariable("ENABLE_SEATS_INGESTION") ?? "true", out var seatsIngestionEnabled);
        if (!seatsIngestionEnabled)
        {
            _logger.LogInformation("Seats ingestion is disabled");
            return;
        }

        // Get GitHub token - either from environment variable or from Secrets Manager
        string token = await GetGitHubTokenAsync();
        if (string.IsNullOrEmpty(token))
        {
            _logger.LogError("GitHub token is required for seats ingestion");
            return;
        }

        var scope = Environment.GetEnvironmentVariable("GITHUB_API_SCOPE")!;
        CopilotAssignedSeats seats;

        if (!string.IsNullOrWhiteSpace(scope) && scope == "enterprise")
        {
            var enterprise = Environment.GetEnvironmentVariable("GITHUB_ENTERPRISE")!;
            _logger.LogInformation("Fetching GitHub Copilot seats for enterprise");
            seats = await _seatsClient.GetEnterpriseAssignedSeatsAsync(enterprise, token);
        }
        else
        {
            _logger.LogInformation("Fetching GitHub Copilot seats for organization FMGSuite");
            seats = await _seatsClient.GetOrganizationAssignedSeatsAsync(FMG_ORGANIZATION, token);
        }

        // Save seats to DynamoDB
        await _dynamoDBService.SaveSeatsAsync(seats);

        _logger.LogInformation("Completed GitHub Copilot seats ingestion at: {time}", DateTimeOffset.Now);
    }

    private async Task<string> GetGitHubTokenAsync()
    {
        // Try to get token from environment variable first
        string token = Environment.GetEnvironmentVariable("GITHUB_TOKEN");
        if (!string.IsNullOrEmpty(token))
        {
            return token;
        }
        
        // If not found in environment, try to get from AWS Secrets Manager
        var secretName = Environment.GetEnvironmentVariable("GITHUB_TOKEN_SECRET_NAME");
        if (string.IsNullOrEmpty(secretName) || _secretsManager == null)
        {
            _logger.LogWarning("GitHub token secret name is not configured or Secrets Manager client is not available");
            return null;
        }

        try
        {
            var request = new GetSecretValueRequest
            {
                SecretId = secretName
            };

            var response = await _secretsManager.GetSecretValueAsync(request);
            if (!string.IsNullOrEmpty(response.SecretString))
            {
                // If the secret is stored directly as a string
                if (response.SecretString.StartsWith("{"))
                {
                    // If the secret is a JSON object
                    var secretJson = JsonSerializer.Deserialize<Dictionary<string, string>>(response.SecretString);
                    if (secretJson.TryGetValue("GITHUB_TOKEN", out string secretToken))
                    {
                        return secretToken;
                    }
                }
                
                return response.SecretString;
            }
            
            _logger.LogWarning("GitHub token not found in Secrets Manager");
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving GitHub token from Secrets Manager");
            return null;
        }
    }
}