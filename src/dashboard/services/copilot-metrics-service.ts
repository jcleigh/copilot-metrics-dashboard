import {
  formatResponseError,
  unknownResponseError,
} from "@/features/common/response-error";
import {
  CopilotMetrics,
  CopilotUsageOutput,
} from "@/features/common/models";
import { ServerActionResponse } from "@/features/common/server-action-response";
import { format } from "date-fns";
import { dynamoDbClient, dynamoDBConfiguration } from "./dynamodb-service";
import { ensureGitHubEnvConfig } from "./env-service";
import { stringIsNullOrEmpty, applyTimeFrameLabel } from "../utils/helpers";
import { sampleData } from "./sample-data";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";

export interface IFilter {
  startDate?: Date;
  endDate?: Date;
  enterprise: string;
  organization: string;
  team: string;
}

export const getCopilotMetrics = async (
  filter: IFilter
): Promise<ServerActionResponse<CopilotUsageOutput[]>> => {
  const env = ensureGitHubEnvConfig();
  const isDynamoDBConfig = dynamoDBConfiguration();

  if (env.status !== "OK") {
    return env;
  }

  const { enterprise, organization } = env.response;

  try {
    switch (process.env.GITHUB_API_SCOPE) {
      case "enterprise":
        if (stringIsNullOrEmpty(filter.enterprise)) {
          filter.enterprise = enterprise;
        }
        break;
      default:
        if (stringIsNullOrEmpty(filter.organization)) {
          filter.organization = organization;
        }
        break;
    }
    if (isDynamoDBConfig) {
      return getCopilotMetricsFromDatabase(filter);
    }
    return getCopilotMetricsFromApi(filter);
  } catch (e) {
    return unknownResponseError(e);
  }
};

const fetchCopilotMetrics = async (
  url: string,
  token: string,
  version: string,
  entityName: string
): Promise<ServerActionResponse<CopilotUsageOutput[]>> => {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: `application/vnd.github+json`,
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": version,
    },
  });

  if (!response.ok) {
    return formatResponseError(entityName, response);
  }

  const data = await response.json();
  const dataWithTimeFrame = applyTimeFrameLabel(data);
  return {
    status: "OK",
    response: dataWithTimeFrame,
  };
};

export const getCopilotMetricsFromApi = async (
  filter: IFilter
): Promise<ServerActionResponse<CopilotUsageOutput[]>> => {
  const env = ensureGitHubEnvConfig();

  if (env.status !== "OK") {
    return env;
  }

  const { token, version } = env.response;

  try {
    const queryParams = new URLSearchParams();
    
    if (filter.startDate) {
      queryParams.append('since', format(filter.startDate, "yyyy-MM-dd"));
    }
    if (filter.endDate) {
      queryParams.append('until', format(filter.endDate, "yyyy-MM-dd"));
    }
    
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';

    if (filter.enterprise) {
      const url = `https://api.github.com/enterprises/${filter.enterprise}/copilot/metrics${queryString}`;
      return fetchCopilotMetrics(url, token, version, filter.enterprise);
    } else {
      const url = `https://api.github.com/orgs/${filter.organization}/copilot/metrics${queryString}`;
      return fetchCopilotMetrics(url, token, version, filter.organization);
    }
  } catch (e) {
    return unknownResponseError(e);
  }
};

export const getCopilotMetricsFromDatabase = async (
  filter: IFilter
): Promise<ServerActionResponse<CopilotUsageOutput[]>> => {
  const client = dynamoDbClient();
  const tableName = "metrics_history";

  let start = "";
  let end = "";
  const maximumDays = 31;

  if (filter.startDate && filter.endDate) {
    start = format(filter.startDate, "yyyy-MM-dd");
    end = format(filter.endDate, "yyyy-MM-dd");
  } else {
    // set the start date to today and the end date to 31 days ago
    const todayDate = new Date();
    const startDate = new Date(todayDate);
    startDate.setDate(todayDate.getDate() - maximumDays);

    start = format(startDate, "yyyy-MM-dd");
    end = format(todayDate, "yyyy-MM-dd");
  }

  // For DynamoDB, we'll need a different approach than CosmosDB SQL queries
  // We'll use a between operator on the date for a date range query
  let expressionAttributeValues: Record<string, any> = {
    ":start": start,
    ":end": end
  };

  // Build the filter expression for additional conditions
  let filterExpressions: string[] = ["date BETWEEN :start AND :end"];
  
  if (filter.enterprise) {
    filterExpressions.push("enterprise = :enterprise");
    expressionAttributeValues[":enterprise"] = filter.enterprise;
  }

  if (filter.organization) {
    filterExpressions.push("organization = :organization");
    expressionAttributeValues[":organization"] = filter.organization;
  }

  if (filter.team) {
    filterExpressions.push("team = :team");
    expressionAttributeValues[":team"] = filter.team;
  }

  // Using a Global Secondary Index for date queries if available
  // Here we're assuming there's a GSI with 'date' as the partition key
  // If your actual DynamoDB design is different, this will need adjustment
  const params = {
    TableName: tableName,
    IndexName: "DateIndex", // Assuming there's a GSI named DateIndex with date as the key
    KeyConditionExpression: "date BETWEEN :start AND :end",
    ExpressionAttributeValues: expressionAttributeValues,
    FilterExpression: filterExpressions.slice(1).join(" AND ")
  };

  try {
    const command = new QueryCommand(params);
    const response = await client.send(command);
    
    if (!response.Items || response.Items.length === 0) {
      return {
        status: "ERROR",
        error: {
          message: "No data found for the specified date range",
        }
      };
    }

    const dataWithTimeFrame = applyTimeFrameLabel(response.Items as CopilotMetrics[]);
    return {
      status: "OK",
      response: dataWithTimeFrame,
    };
  } catch (error) {
    return unknownResponseError(error);
  }
};

export const _getCopilotMetrics = (): Promise<CopilotUsageOutput[]> => {
  const promise = new Promise<CopilotUsageOutput[]>((resolve) => {
    setTimeout(() => {
      const weekly = applyTimeFrameLabel(sampleData);
      resolve(weekly);
    }, 1000);
  });

  return promise;
};
