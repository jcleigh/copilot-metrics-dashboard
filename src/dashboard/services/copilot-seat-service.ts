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
import { dynamoClient } from "./dynamodb-service";
import { format } from "date-fns";
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

  if (env.status !== "OK") {
    return env;
  }

  const { enterprise, organization, token, version } = env.response;

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
    return getCopilotSeatsFromDatabase(filter);
  } catch (e) {
    return unknownResponseError(e);
  }
};

const getCopilotSeatsFromDatabase = async (
  filter: IFilter
): Promise<ServerActionResponse<CopilotSeatsData>> => {
  const client = dynamoClient();
  const tableName = "platform-engineering-seats-history";

  let date = "";
  const maxDays = 365 * 2; // maximum 2 years of data

  if (filter.date) {
    date = format(filter.date, "yyyy-MM-dd");
  } else {
    const today = new Date();
    date = format(today, "yyyy-MM-dd");
  }

  let params = {
    TableName: tableName,
    FilterExpression: "#date = :date",
    ExpressionAttributeNames: {
      "#date": "date",
    },
    ExpressionAttributeValues: {
      ":date": date,
    },
  };
  if (filter.enterprise) {
    params.FilterExpression += ` AND #enterprise = :enterprise`;
    params.ExpressionAttributeNames["#enterprise"] = "enterprise";
    params.ExpressionAttributeValues[":enterprise"] = filter.enterprise;
  }
  if (filter.organization) {
    params.FilterExpression += ` AND #organization = :organization`;
    params.ExpressionAttributeNames["#organization"] = "organization";
    params.ExpressionAttributeValues[":organization"] = filter.organization;
  }
  if (filter.team) {
    params.FilterExpression += ` AND #team = :team`;
    params.ExpressionAttributeNames["#team"] = "team";
    params.ExpressionAttributeValues[":team"] = filter.team;
  }

  const data = await client.scan(params).promise();
  const resources = data.Items as CopilotSeatsData[];

  return {
    status: "OK",
    response: resources[0],
  };
};

export const getCopilotSeatsManagement = async (
  filter: IFilter
): Promise<ServerActionResponse<CopilotSeatManagementData>> => {
  const env = ensureGitHubEnvConfig();

  if (env.status !== "OK") {
    return env;
  }

  const { enterprise, organization, token, version } = env.response;

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
    return getCopilotSeatsManagementFromAPI(filter);
  } catch (e) {
    return unknownResponseError(e);
  }
};

const getCopilotSeatsManagementFromAPI = async (
  filter: IFilter
): Promise<ServerActionResponse<CopilotSeatManagementData>> => {
  const env = ensureGitHubEnvConfig();

  if (env.status !== "OK") {
    return env;
  }

  let { enterprise, organization, token, version } = env.response;

  try {
    switch (process.env.GITHUB_API_SCOPE) {
      case "enterprise":
        if (stringIsNullOrEmpty(filter.enterprise)) {
          filter.enterprise = enterprise;
        }
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
            return formatResponseError(enterprise, enterpriseResponse);
          }

          const enterpriseData = await enterpriseResponse.json();
          enterpriseSeats.seats.push(...enterpriseData.seats);
          enterpriseSeats.total_seats = enterpriseData.total_seats;

          const linkHeader = enterpriseResponse.headers.get("Link");
          url = getNextUrlFromLinkHeader(linkHeader) || "";
        } while (!stringIsNullOrEmpty(url));

        // Copilot seats are considered active if they have been active in the last 30 days
        const activeSeats = enterpriseSeats.seats.filter((seat) => {
          const lastActivityDate = new Date(seat.last_activity_at);
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return lastActivityDate >= thirtyDaysAgo;
        });
        const seatManagementData: CopilotSeatManagementData = {
          enterprise: enterpriseSeats.enterprise,
          organization: enterpriseSeats.organization,
          date: enterpriseSeats.date,
          id: enterpriseSeats.id,
          last_update: enterpriseSeats.last_update,
          total_seats: enterpriseSeats.total_seats,
          seats: {
            seat_breakdown: {
              total: enterpriseSeats.seats.length,
              active_this_cycle: activeSeats.length,
              inactive_this_cycle:
                enterpriseSeats.seats.length - activeSeats.length,
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
        break;

      default:
        if (stringIsNullOrEmpty(filter.organization)) {
          filter.organization = organization;
        }
        const response = await fetch(
          `https://api.github.com/orgs/${filter.organization}/copilot/billing`,
          {
            cache: "no-store",
            headers: {
              Accept: `application/vnd.github+json`,
              Authorization: `Bearer ${token}`,
              "X-GitHub-Api-Version": version,
            },
          }
        );

        if (!response.ok) {
          return formatResponseError(filter.organization, response);
        }

        const seats = await response.json();
        const _today = new Date();
        const data: CopilotSeatManagementData = {
          id: `${format(_today, "yyyy-MM-dd")}-ORG-${filter.organization}`,
          date: format(_today, "yyyy-MM-dd"),
          last_update: format(_today, "yyyy-MM-ddTHH:mm:ss"),
          total_seats: seats.total_seats,
          seats: seats as CopilotSeatManagementData["seats"],
          enterprise: filter.enterprise,
          organization: filter.organization,
        };
        return {
          status: "OK",
          response: data as CopilotSeatManagementData,
        };
        break;
    }
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
