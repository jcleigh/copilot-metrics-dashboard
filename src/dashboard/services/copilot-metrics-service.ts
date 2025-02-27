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
import { cosmosClient, cosmosConfiguration, useLocalDatabase } from "./cosmos-db-service";
import { ensureGitHubEnvConfig } from "./env-service";
import { stringIsNullOrEmpty, applyTimeFrameLabel } from "../utils/helpers";
import { sampleData } from "./sample-data";
import { executeQuery, QueryParams } from "./local-db-service";

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
  const isDbConfig = cosmosConfiguration();

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
    if (isDbConfig) {
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
  try {
    let start = "";
    let end = "";
    const maxDays = 365 * 2; // maximum 2 years of data
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

    // Build query based on the database being used
    if (useLocalDatabase) {
      // SQLite query
      let query = "SELECT * FROM metrics_history WHERE date >= :start AND date <= :end";
      const params: Record<string, any> = { start, end };
      
      if (filter.enterprise) {
        query += " AND enterprise = :enterprise";
        params.enterprise = filter.enterprise;
      }

      if (filter.organization) {
        query += " AND organization = :organization";
        params.organization = filter.organization;
      }
      
      if (filter.team) {
        query += " AND team = :team";
        params.team = filter.team;
      }

      const queryParams: QueryParams = { query, params };
      const results = executeQuery<any>(queryParams);

      // Parse the JSON data from each row
      const metrics = results.map(row => {
        return {
          ...row,
          ...JSON.parse(row.data)
        };
      });

      const dataWithTimeFrame = applyTimeFrameLabel(metrics);
      return {
        status: "OK",
        response: dataWithTimeFrame,
      };
    } else {
      // Original CosmosDB implementation
      const client = cosmosClient();
      const database = client.database("platform-engineering");
      const container = database.container("metrics_history");

      let querySpec = {
        query: `SELECT * FROM c WHERE c.date >= @start AND c.date <= @end`,
        parameters: [
          { name: "@start", value: start },
          { name: "@end", value: end },
        ],
      };

      if (filter.enterprise) {
        querySpec.query += ` AND c.enterprise = @enterprise`;
        querySpec.parameters?.push({
          name: "@enterprise",
          value: filter.enterprise,
        });
      }

      if (filter.organization) {
        querySpec.query += ` AND c.organization = @organization`;
        querySpec.parameters?.push({
          name: "@organization",
          value: filter.organization,
        });
      }
      
      if (filter.team) {
        querySpec.query += ` AND c.team = @team`;
        querySpec.parameters?.push({ name: "@team", value: filter.team });
      }

      const { resources } = await container.items
        .query<CopilotMetrics>(querySpec, {
          maxItemCount: maxDays,
        })
        .fetchAll();

      const dataWithTimeFrame = applyTimeFrameLabel(resources);
      return {
        status: "OK",
        response: dataWithTimeFrame,
      };
    }
  } catch (e) {
    return unknownResponseError(e);
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
