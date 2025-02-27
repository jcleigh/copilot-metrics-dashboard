import { hasData, importSampleMetricsData } from "../utils/data-import";

/**
 * Database initialization module.
 * This module automatically checks if the database has data and seeds it if needed.
 */

let isInitialized = false;

export const ensureDatabaseInitialized = (): boolean => {
  // Only run initialization once per server start
  if (isInitialized) {
    return true;
  }

  // Check if database has data, if not seed it with sample data
  if (!hasData()) {
    console.log('Initializing database with sample data...');
    const results = importSampleMetricsData();
    console.log(`Database initialized with ${results.metrics} metrics and ${results.seats} seat entries.`);
  } else {
    console.log('Database already contains data, skipping initialization.');
  }
  
  isInitialized = true;
  return isInitialized;
};

// Export a function to force reinitialization if needed
export const reinitializeDatabase = (): boolean => {
  isInitialized = false;
  return ensureDatabaseInitialized();
};