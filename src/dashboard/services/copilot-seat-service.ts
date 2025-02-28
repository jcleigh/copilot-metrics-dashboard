import {
  formatResponseError,
  unknownResponseError,
} from "@/features/common/response-error";
import { ServerActionResponse } from "@/features/common/server-action-response";
import { ensureGitHubEnvConfig } from "./env-service";
import {
  CopilotSeatsData,
  CopilotSeatManagementData,
} from "@/features/common/models";
import { dynamoDbClient, dynamoDBConfiguration, createDynamoDbQuery } from "./dynamodb-service";
import { format } from "date-fns";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { stringIsNullOrEmpty } from "../utils/helpers";

export interface IFilter {
  date?: Date;
  enterprise: string;
  organization: string;
  team: string;
}

export const getCopilotSeats = async (
  filter: IFilter
): Promise<ServerActionResponse<CopilotSeatsData>> => {
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
      return getCopilotSeatsFromDatabase(filter);
    }
    return getCopilotSeatsFromApi(filter);
  } catch (e) {
    return unknownResponseError(e);
  }
};

const getCopilotSeatsFromDatabase = async (
  filter: IFilter
): Promise<ServerActionResponse<CopilotSeatsData>> => {
  const client = dynamoDbClient();
  const tableName = "seats_history";

  let date = "";
  
  if (filter.date) {
    date = format(filter.date, "yyyy-MM-dd");
  } else {
    const today = new Date();
    date = format(today, "yyyy-MM-dd");
  }

  // Start with basic query parameters
  let keyConditionExpression = "date = :date";
  let expressionAttributeValues: Record<string, any> = {
    ":date": date,
  };
  let filterExpression = "";

  // Add filters for enterprise or organization
  if (filter.enterprise) {
    filterExpression = "enterprise = :enterprise";
    expressionAttributeValues[":enterprise"] = filter.enterprise;
  } else if (filter.organization) {
    filterExpression = "organization = :organization";
    expressionAttributeValues[":organization"] = filter.organization;
  }

  // Add filter for team if provided
  if (filter.team) {
    filterExpression += filterExpression ? " AND " : "";
    filterExpression += "team = :team";
    expressionAttributeValues[":team"] = filter.team;
  }

  const queryParams = {
    TableName: tableName,
    KeyConditionExpression: keyConditionExpression,
    ExpressionAttributeValues: expressionAttributeValues,
    ...(filterExpression && { FilterExpression: filterExpression }),
    Limit: 1 // We only need one item
  };

  try {
    const command = new QueryCommand(queryParams);
    const response = await client.send(command);
    
    if (!response.Items || response.Items.length === 0) {
      return {
        status: "ERROR",
        error: {
          message: "No data found for the specified filter",
        }
      };
    }

    return {
      status: "OK",
      response: response.Items[0] as CopilotSeatsData,
    };
  } catch (error) {
    return unknownResponseError(error);
  }
};

const getCopilotSeatsFromApi = async (
  filter: IFilter
): Promise<ServerActionResponse<CopilotSeatsData>> => {
  const env = ensureGitHubEnvConfig();

  if (env.status !== "OK") {
    return env;
  }

  let { token, version } = env.response;

  try {
    if (filter.enterprise) { 
      const today = new Date();
      const enterpriseSeats: CopilotSeatsData = {
        enterprise: filter.enterprise,
        seats: [],
        total_seats: 0,
        last_update: format(today, "yyyy-MM-ddTHH:mm:ss"),
        date: format(today, "yyyy-MM-dd"),
        id: `${today}-ENT-${filter.enterprise}`,
        organization: null,
      };

      let url = `https://api.github.com/enterprises/${filter.enterprise}/copilot/billing/seats`;
      do {
        const enterpriseResponse = await fetch(url, {
          cache: "no-store",
          headers: {
            Accept: `application/vnd.github+json`,
            Authorization: `Bearer ${token}`,
            "X-GitHub-Api-Version": version,
          },
        });

        if (!enterpriseResponse.ok) {
          return formatResponseError(filter.enterprise, enterpriseResponse);
        }

        const enterpriseData = await enterpriseResponse.json();
        enterpriseSeats.seats.push(...enterpriseData.seats);
        enterpriseSeats.total_seats = enterpriseData.total_seats;

        const linkHeader = enterpriseResponse.headers.get("Link");
        url = getNextUrlFromLinkHeader(linkHeader) || "";
      } while (!stringIsNullOrEmpty(url));

      return {
        status: "OK",
        response: enterpriseSeats as CopilotSeatsData,
      };
    }
    else {
      const today = new Date();
      const organizationSeats: CopilotSeatsData = {
        organization: filter.organization,
        seats: [],
        total_seats: 0,
        last_update: format(today, "yyyy-MM-ddTHH:mm:ss"),
        date: format(today, "yyyy-MM-dd"),
        id: `${today}-ORG-${filter.organization}`,
        enterprise: null,
      };

      let url = `https://api.github.com/orgs/${filter.organization}/copilot/billing/seats`;
      do {
        const organizationResponse = await fetch(url, {
          cache: "no-store",
          headers: {
            Accept: `application/vnd.github+json`,
            Authorization: `Bearer ${token}`,
            "X-GitHub-Api-Version": version,
          },
        });

        if (!organizationResponse.ok) {
          return formatResponseError(filter.organization, organizationResponse);
        }

        const organizationData = await organizationResponse.json();
        organizationSeats.seats.push(...organizationData.seats);
        organizationSeats.total_seats = organizationData.total_seats;

        const linkHeader = organizationResponse.headers.get("Link");
        url = getNextUrlFromLinkHeader(linkHeader) || "";
      } while (!stringIsNullOrEmpty(url));

      return {
        status: "OK",
        response: organizationSeats as CopilotSeatsData,
      };
    }
  } catch (e) {
    return unknownResponseError(e);
  }
};

export const getCopilotSeatsManagement = async (
  filter: IFilter
): Promise<ServerActionResponse<CopilotSeatManagementData>> => {
  const env = ensureGitHubEnvConfig();

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

    const data = await getCopilotSeats(filter);
    if (data.status !== "OK" || !data.response) {
      return unknownResponseError(filter.enterprise);
    }
    const seatsData = data.response;

    // Copilot seats are considered active if they have been active in the last 30 days
    const activeSeats = seatsData.seats.filter((seat) => {
      const lastActivityDate = new Date(seat.last_activity_at);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return lastActivityDate >= thirtyDaysAgo;
    });
    const seatManagementData: CopilotSeatManagementData = {
      enterprise: seatsData.enterprise,
      organization: seatsData.organization,
      date: seatsData.date,
      id: seatsData.id,
      last_update: seatsData.last_update,
      total_seats: seatsData.total_seats,
      seats: {
        seat_breakdown: {
          total: seatsData.seats.length,
          active_this_cycle: activeSeats.length,
          inactive_this_cycle: seatsData.seats.length - activeSeats.length,
          added_this_cycle: 0,
          pending_invitation: 0,
          pending_cancellation: 0,
        },
        seat_management_setting: "",
        public_code_suggestions: "",
        ide_chat: "",
        platform_chat: "",
        cli: "",
        plan_type: "",
      },
    };

    return {
      status: "OK",
      response: seatManagementData as CopilotSeatManagementData,
    };
  } catch (e) {
    return unknownResponseError(e);
  }
};

const getNextUrlFromLinkHeader = (linkHeader: string | null): string | null => {
  if (!linkHeader) return null;

  const links = linkHeader.split(',');
  for (const link of links) {
    const match = link.match(/<([^>]+)>;\s*rel="([^"]+)"/);
    if (match && match[2] === 'next') {
      return match[1];
    }
  }
  return null;
}
