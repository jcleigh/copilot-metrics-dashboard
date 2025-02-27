import { format } from "date-fns";
import { getDbConnection } from "../services/local-db-service";
import { sampleData } from "../services/sample-data";

/**
 * Utility functions for importing data into the local SQLite database
 */

// Import sample metric data into the local database
export const importSampleMetricsData = (organization: string = "sample-org", enterprise: string = "sample-enterprise") => {
  const db = getDbConnection();

  // Setup sample metrics data
  const today = new Date();
  const metrics = sampleData.map((item, index) => {
    // Generate dates from the past 30 days
    const date = new Date(today);
    date.setDate(today.getDate() - index);
    
    return {
      id: `${format(date, "yyyy-MM-dd")}-${enterprise}-${organization}`,
      date: format(date, "yyyy-MM-dd"),
      enterprise: enterprise,
      organization: organization,
      data: JSON.stringify(item),
      last_update: format(date, "yyyy-MM-ddTHH:mm:ss"),
      team: null
    };
  });

  // Insert sample metrics
  const insertMetrics = db.prepare(`
    INSERT OR REPLACE INTO metrics_history (id, date, enterprise, organization, team, data, last_update)
    VALUES (@id, @date, @enterprise, @organization, @team, @data, @last_update)
  `);

  const insertMetricsTransaction = db.transaction((metrics) => {
    for (const metric of metrics) {
      insertMetrics.run(metric);
    }
  });

  insertMetricsTransaction(metrics);
  
  // Generate sample seat data
  const seatData = {
    id: `${format(today, "yyyy-MM-dd")}-${enterprise}-${organization}`,
    date: format(today, "yyyy-MM-dd"),
    enterprise: enterprise,
    organization: organization,
    team: null,
    seats: JSON.stringify([
      {
        assignee: { login: "user1", name: "User One" },
        last_activity_at: format(today, "yyyy-MM-dd"),
        created_at: format(new Date(today.getFullYear(), today.getMonth() - 1, today.getDate()), "yyyy-MM-dd")
      },
      {
        assignee: { login: "user2", name: "User Two" },
        last_activity_at: format(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 5), "yyyy-MM-dd"),
        created_at: format(new Date(today.getFullYear(), today.getMonth() - 2, today.getDate()), "yyyy-MM-dd")
      },
      {
        assignee: { login: "user3", name: "User Three" },
        last_activity_at: format(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 15), "yyyy-MM-dd"),
        created_at: format(new Date(today.getFullYear(), today.getMonth() - 3, today.getDate()), "yyyy-MM-dd")
      },
      {
        assignee: { login: "user4", name: "User Four" },
        last_activity_at: format(new Date(today.getFullYear(), today.getMonth() - 1, today.getDate()), "yyyy-MM-dd"),
        created_at: format(new Date(today.getFullYear(), today.getMonth() - 4, today.getDate()), "yyyy-MM-dd")
      },
      {
        assignee: { login: "user5", name: "User Five" },
        last_activity_at: format(today, "yyyy-MM-dd"),
        created_at: format(new Date(today.getFullYear(), today.getMonth() - 2, today.getDate()), "yyyy-MM-dd")
      }
    ]),
    total_seats: 5,
    last_update: format(today, "yyyy-MM-ddTHH:mm:ss")
  };

  // Insert seat data
  const insertSeats = db.prepare(`
    INSERT OR REPLACE INTO seats_history (id, date, enterprise, organization, team, seats, total_seats, last_update)
    VALUES (@id, @date, @enterprise, @organization, @team, @seats, @total_seats, @last_update)
  `);
  
  insertSeats.run(seatData);

  return {
    metrics: metrics.length,
    seats: 1
  };
};

// Check if the database already has data
export const hasData = (): boolean => {
  const db = getDbConnection();
  
  const metricsCount = db.prepare("SELECT COUNT(*) as count FROM metrics_history").get();
  const seatsCount = db.prepare("SELECT COUNT(*) as count FROM seats_history").get();
  
  return metricsCount.count > 0 && seatsCount.count > 0;
};