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

  // For DynamoDB, we'll query each date within our range
  const allItems: any[] = [];
  let currentDate = new Date(start);
  const endDate = new Date(end);

  while (currentDate <= endDate) {
    const formattedDate = format(currentDate, "yyyy-MM-dd");
    let expressionAttributeValues: Record<string, any> = {
      ":recordDate": formattedDate,
    };

    let filterExpressions: string[] = [];
    
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

    const params = {
      TableName: tableName,
      IndexName: "DateIndex",
      KeyConditionExpression: "recordDate = :recordDate",
      ExpressionAttributeValues: expressionAttributeValues,
      ...(filterExpressions.length > 0 && { FilterExpression: filterExpressions.join(" AND ") })
    };

    try {
      const command = new QueryCommand(params);
      const response = await client.send(command);
      
      if (response.Items && response.Items.length > 0) {
        allItems.push(...response.Items);
      }
    } catch (error) {
      return unknownResponseError(error);
    }

    // Move to next date
    currentDate.setDate(currentDate.getDate() + 1);
  }

  if (allItems.length === 0) {
    return {
      status: "ERROR",
      error: {
        message: "No data found for the specified date range",
      }
    };
  }

  const dataWithTimeFrame = applyTimeFrameLabel(allItems as CopilotMetrics[]);
  return {
    status: "OK",
    response: dataWithTimeFrame,
  };
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
