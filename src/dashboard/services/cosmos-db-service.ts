import { ServerActionResponse } from "@/features/common/server-action-response";
import { stringIsNullOrEmpty } from "../utils/helpers";
import { getDbConnection, localDbConfiguration } from "./local-db-service";

// Default to using local database
export const useLocalDatabase = process.env.USE_LOCAL_DB !== "false";

// Keep the original Azure implementation for compatibility
export const cosmosConfiguration = (): boolean => {
  if (useLocalDatabase) {
    return localDbConfiguration();
  }
  
  // Original Azure implementation
  const endpoint = process.env.AZURE_COSMOSDB_ENDPOINT;
  return (
    endpoint !== undefined &&
    endpoint.trim() !== ""
  );
};

// This is a compatibility layer so existing code still works
export const cosmosClient = () => {
  if (useLocalDatabase) {
    // For local db usage, we'll just return a dummy object that will never be used
    // The actual implementation will be in the database-specific functions
    return {
      database: (dbName: string) => ({
        container: (containerName: string) => ({
          items: {
            query: () => ({
              fetchAll: async () => ({ resources: [] })
            })
          }
        })
      })
    };
  }
  
  // If not using local DB, try to use Azure CosmosDB
  const endpoint = process.env.AZURE_COSMOSDB_ENDPOINT;

  if(stringIsNullOrEmpty(endpoint)) {
    throw new Error("Missing required environment variable for CosmosDB endpoint");
  }

  try {
    // Check if @azure modules are available
    const { CosmosClient } = require("@azure/cosmos");
    const { DefaultAzureCredential } = require("@azure/identity");
    
    const credential = new DefaultAzureCredential();
    return new CosmosClient({ endpoint, aadCredentials: credential });
  } catch (error) {
    console.error("Error loading Azure modules:", error);
    throw new Error("Failed to initialize Azure CosmosDB client. Make sure @azure/cosmos and @azure/identity packages are installed.");
  }
};