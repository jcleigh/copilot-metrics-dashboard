using Amazon.Lambda.Core;
using Amazon.Lambda.SQSEvents;
using Microsoft.CopilotDashboard.DataIngestion.Models;
using Microsoft.CopilotDashboard.DataIngestion.Services;
using Microsoft.Extensions.Logging;

namespace Microsoft.CopilotDashboard.DataIngestion.Functions;

public class CopilotSeatsIngestion
{
    private readonly ILogger _logger;
    private readonly GitHubCopilotApiService _gitHubCopilotApiService;

    public CopilotSeatsIngestion(GitHubCopilotApiService gitHubCopilotApiService, ILogger<CopilotSeatsIngestion> logger)
    {
        _gitHubCopilotApiService = gitHubCopilotApiService;
        _logger = logger;
    }

    [LambdaFunction]
    public async Task<CopilotAssignedSeats> Run(SQSEvent sqsEvent)
    {
        _logger.LogInformation($"GitHubCopilotSeatsIngestion SQS event function executed at: {DateTime.Now}");

        CopilotAssignedSeats seats;

        var token = Environment.GetEnvironmentVariable("GITHUB_TOKEN")!;
        var scope = Environment.GetEnvironmentVariable("GITHUB_API_SCOPE")!;
        Boolean.TryParse(Environment.GetEnvironmentVariable("ENABLE_SEATS_INGESTION") ?? "true", out var seatsIngestionEnabled);
        if (!seatsIngestionEnabled)
        {
            _logger.LogInformation("Seats ingestion is disabled");
            return null!;
        }
        if (!string.IsNullOrWhiteSpace(scope) && scope == "enterprise")
        {
            var enterprise = Environment.GetEnvironmentVariable("GITHUB_ENTERPRISE")!;
            _logger.LogInformation("Fetching GitHub Copilot seats for enterprise");
            seats = await _gitHubCopilotApiService.GetEnterpriseAssignedSeatsAsync(enterprise, token);
        }
        else
        {
            var organization = Environment.GetEnvironmentVariable("GITHUB_ORGANIZATION")!;
            _logger.LogInformation("Fetching GitHub Copilot seats for organization");
            seats = await _gitHubCopilotApiService.GetOrganizationAssignedSeatsAsync(organization, token);
        }

        _logger.LogInformation($"Finished ingestion. SQS event processed at: {DateTime.Now}");

        return seats;
    }
}
