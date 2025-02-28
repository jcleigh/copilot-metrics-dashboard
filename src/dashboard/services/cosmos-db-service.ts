// This file is deprecated as the application now uses DynamoDB instead of CosmosDB.
// The cosmosConfiguration function is kept for backward compatibility, but returns false.

export const cosmosConfiguration = (): boolean => {
  // Always return false since CosmosDB is no longer supported
  return false;
};