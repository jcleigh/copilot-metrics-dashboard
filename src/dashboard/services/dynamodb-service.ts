import { ServerActionResponse } from "@/features/common/server-action-response";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { stringIsNullOrEmpty } from "../utils/helpers";

export const dynamoClient = () => {
  const endpoint = process.env.AWS_DYNAMODB_ENDPOINT;

  if(stringIsNullOrEmpty(endpoint)) {
    throw new Error("Missing required environment variable for DynamoDB endpoint");
  }

  return new DynamoDBClient({ endpoint });
};

export const dynamoConfiguration = (): boolean => {
  const endpoint = process.env.AWS_DYNAMODB_ENDPOINT;

  return (
    endpoint !== undefined &&
    endpoint.trim() !== ""
  );
};
