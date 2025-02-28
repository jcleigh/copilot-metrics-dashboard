import { ServerActionResponse } from "@/features/common/server-action-response";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommandInput } from "@aws-sdk/lib-dynamodb";
import { fromEnv } from "@aws-sdk/credential-providers";
import { stringIsNullOrEmpty } from "../utils/helpers";

export const dynamoDbClient = () => {
  const isLocal = process.env.DYNAMODB_LOCAL === 'true';
  const region = process.env.AWS_REGION;
  const endpoint = process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000';

  if(!isLocal && stringIsNullOrEmpty(region)) {
    throw new Error("Missing required environment variable for AWS region");
  }

  // Create the DynamoDB client
  const client = isLocal 
    ? new DynamoDBClient({
        endpoint,
        region: 'local-env',
        credentials: {
          accessKeyId: 'local',
          secretAccessKey: 'local',
        }
      })
    : new DynamoDBClient({ 
        region,
        credentials: fromEnv()
      });

  // Create the DynamoDB document client wrapper
  return DynamoDBDocumentClient.from(client, {
    marshallOptions: {
      removeUndefinedValues: true,
    }
  });
};

export const dynamoDBConfiguration = (): boolean => {
  const isLocal = process.env.DYNAMODB_LOCAL === 'true';
  const region = process.env.AWS_REGION;

  return (
    isLocal ||
    (region !== undefined && region.trim() !== "")
  );
};

// Helper to create a standard query structure for DynamoDB
export const createDynamoDbQuery = (
  tableName: string,
  keyConditionExpression: string,
  expressionAttributeValues: Record<string, any>,
  expressionAttributeNames?: Record<string, string>,
  indexName?: string
): QueryCommandInput => {
  const query: QueryCommandInput = {
    TableName: tableName,
    KeyConditionExpression: keyConditionExpression,
    ExpressionAttributeValues: expressionAttributeValues,
  };

  if (expressionAttributeNames) {
    query.ExpressionAttributeNames = expressionAttributeNames;
  }

  if (indexName) {
    query.IndexName = indexName;
  }

  return query;
};