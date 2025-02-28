import { ServerActionResponse } from "@/features/common/server-action-response";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommandInput } from "@aws-sdk/lib-dynamodb";
import { fromEnv } from "@aws-sdk/credential-providers";
import { stringIsNullOrEmpty } from "../utils/helpers";

export const dynamoDbClient = () => {
  const region = process.env.AWS_REGION;

  if(stringIsNullOrEmpty(region)) {
    throw new Error("Missing required environment variable for AWS region");
  }

  // Create the DynamoDB client
  const client = new DynamoDBClient({ 
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
  const region = process.env.AWS_REGION;

  return (
    region !== undefined &&
    region.trim() !== ""
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