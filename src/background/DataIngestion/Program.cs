using System.Net.Http.Headers;
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.DataModel;
using Amazon.SecretsManager;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.CopilotDashboard.DataIngestion.Services;

var builder = Host.CreateDefaultBuilder(args);

builder.ConfigureAppConfiguration((hostingContext, config) =>
{
    config.AddJsonFile("appsettings.json", optional: false, reloadOnChange: true);
    config.AddJsonFile($"appsettings.{hostingContext.HostingEnvironment.EnvironmentName}.json", optional: true);
    config.AddEnvironmentVariables();
});

builder.ConfigureServices((hostContext, services) =>
{
    // Configure GitHub API options
    services.Configure<GithubMetricsApiOptions>(hostContext.Configuration.GetSection("GITHUB_METRICS"));

    // Configure AWS DynamoDB
    var region = Environment.GetEnvironmentVariable("AWS_REGION");
    var isLocal = string.Equals(Environment.GetEnvironmentVariable("DYNAMODB_LOCAL"), "true", StringComparison.OrdinalIgnoreCase);
    var endpointUrl = Environment.GetEnvironmentVariable("DYNAMODB_ENDPOINT") ?? "http://localhost:8000";

    if (isLocal)
    {
        services.AddSingleton<IAmazonDynamoDB>(sp =>
        {
            var clientConfig = new AmazonDynamoDBConfig
            {
                ServiceURL = endpointUrl
            };
            return new AmazonDynamoDBClient("local", "local", clientConfig);
        });
        
        // Add dummy Secrets Manager for local development
        services.AddSingleton<IAmazonSecretsManager>(sp =>
        {
            return null;
        });
    }
    else
    {
        services.AddAWSService<IAmazonDynamoDB>(new Amazon.Extensions.NETCore.Setup.AWSOptions
        {
            Region = Amazon.RegionEndpoint.GetBySystemName(region)
        });
        
        // Add AWS Secrets Manager
        services.AddAWSService<IAmazonSecretsManager>(new Amazon.Extensions.NETCore.Setup.AWSOptions
        {
            Region = Amazon.RegionEndpoint.GetBySystemName(region)
        });
    }

    // Add HTTP clients
    services.AddHttpClient<GitHubCopilotMetricsClient>(ConfigureClient);
    services.AddHttpClient<GitHubCopilotSeatsClient>(ConfigureClient);
    
    // Add services
    services.AddSingleton<DynamoDBService>();
    
    // Add hosted service for data ingestion
    services.AddHostedService<DataIngestionService>();
});

var host = builder.Build();
await host.RunAsync();

void ConfigureClient(HttpClient httpClient)
{
    var apiVersion = Environment.GetEnvironmentVariable("GITHUB_API_VERSION");
    var token = Environment.GetEnvironmentVariable("GITHUB_TOKEN");
    var gitHubApiBaseUrl = Environment.GetEnvironmentVariable("GITHUB_API_BASEURL") ?? "https://api.github.com/";

    httpClient.BaseAddress = new Uri(gitHubApiBaseUrl);
    httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.github+json"));
    
    // Token might be fetched from Secrets Manager later for specific operations
    if (!string.IsNullOrEmpty(token))
    {
        httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
    }
    
    httpClient.DefaultRequestHeaders.Add("X-GitHub-Api-Version", apiVersion);
    httpClient.DefaultRequestHeaders.Add("User-Agent", "GitHubCopilotDataIngestion");
}

// Simple startup service to log application start
public class AppStartupService : IHostedService
{
    private readonly ILogger<AppStartupService> _logger;

    public AppStartupService(ILogger<AppStartupService> logger)
    {
        _logger = logger;
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Copilot Dashboard Data Ingestion Service started at: {time}", DateTimeOffset.Now);
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Copilot Dashboard Data Ingestion Service stopped at: {time}", DateTimeOffset.Now);
        return Task.CompletedTask;
    }
}