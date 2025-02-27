#!/usr/bin/env node

/**
 * Database administration script for local development
 * 
 * This script provides utilities for managing the local SQLite database:
 * - Seeding the database with sample data
 * - Clearing all data
 * - Checking database status
 * 
 * Usage: 
 *  node scripts/db-admin.js [command]
 * 
 * Commands:
 *  seed      - Populate the database with sample data
 *  clear     - Remove all data from the database
 *  status    - Show database information and statistics
 */

const fs = require('fs');
const path = require('path');
const sqlite3 = require('better-sqlite3');

// Database configuration
const DB_PATH = process.env.LOCAL_DB_PATH || path.join(process.cwd(), 'data', 'copilot-metrics.db');
const DB_DIR = path.dirname(DB_PATH);

// Ensure the database directory exists
const ensureDbDirectory = () => {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
    console.log(`Created directory: ${DB_DIR}`);
  }
};

// Get database connection
const getDbConnection = () => {
  ensureDbDirectory();
  return sqlite3(DB_PATH);
};

// Initialize database schema
const initSchema = (db) => {
  // Create metrics_history table
  db.exec(`
    CREATE TABLE IF NOT EXISTS metrics_history (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      enterprise TEXT,
      organization TEXT,
      team TEXT,
      data TEXT NOT NULL,
      last_update TEXT NOT NULL
    )
  `);

  // Create seats_history table
  db.exec(`
    CREATE TABLE IF NOT EXISTS seats_history (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      enterprise TEXT,
      organization TEXT,
      team TEXT,
      seats TEXT NOT NULL,
      total_seats INTEGER NOT NULL,
      last_update TEXT NOT NULL
    )
  `);

  console.log('Database schema initialized');
};

// Generate sample data
const generateSampleData = () => {
  const db = getDbConnection();
  initSchema(db);

  // Load sample data from the sample-data file
  console.log('Generating sample data...');
  
  // Generate dates for the last 30 days
  const today = new Date();
  const enterprise = 'sample-enterprise';
  const organization = 'sample-org';

  // Generate synthetic metrics data for the last 30 days
  const metrics = [];
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Generate random metrics data
    const completions = Math.floor(Math.random() * 1000) + 500;
    const suggestions = Math.floor(Math.random() * 2000) + 1000;
    const acceptances = Math.floor(Math.random() * completions);
    
    const metricData = {
      id: `${formattedDate}-${enterprise}-${organization}`,
      date: formattedDate,
      enterprise: enterprise,
      organization: organization,
      team: null,
      data: JSON.stringify({
        completions,
        suggestions,
        acceptances,
        active_users: Math.floor(Math.random() * 20) + 10
      }),
      last_update: new Date().toISOString()
    };
    
    metrics.push(metricData);
  }
  
  // Insert sample metrics
  const insertMetrics = db.prepare(`
    INSERT OR REPLACE INTO metrics_history (id, date, enterprise, organization, team, data, last_update)
    VALUES (@id, @date, @enterprise, @organization, @team, @data, @last_update)
  `);

  db.transaction((metrics) => {
    for (const metric of metrics) {
      insertMetrics.run(metric);
    }
  })(metrics);
  
  console.log(`Added ${metrics.length} sample metrics entries`);
  
  // Generate seat data
  const seatData = {
    id: `${today.toISOString().split('T')[0]}-${enterprise}-${organization}`,
    date: today.toISOString().split('T')[0],
    enterprise: enterprise,
    organization: organization,
    team: null,
    seats: JSON.stringify(
      Array(10).fill().map((_, i) => {
        // Random date in the last 90 days for last activity
        const lastActivityDate = new Date();
        lastActivityDate.setDate(lastActivityDate.getDate() - Math.floor(Math.random() * 90));
        
        // Random date in the last year for creation
        const createdDate = new Date();
        createdDate.setDate(createdDate.getDate() - Math.floor(Math.random() * 365));
        
        return {
          assignee: { 
            login: `user${i + 1}`, 
            name: `User ${i + 1}` 
          },
          last_activity_at: lastActivityDate.toISOString().split('T')[0],
          created_at: createdDate.toISOString().split('T')[0]
        };
      })
    ),
    total_seats: 10,
    last_update: new Date().toISOString()
  };

  // Insert seat data
  const insertSeats = db.prepare(`
    INSERT OR REPLACE INTO seats_history (id, date, enterprise, organization, team, seats, total_seats, last_update)
    VALUES (@id, @date, @enterprise, @organization, @team, @seats, @total_seats, @last_update)
  `);
  
  insertSeats.run(seatData);
  console.log('Added sample seats data');
  
  db.close();
  console.log(`Database seeded successfully: ${DB_PATH}`);
};

// Clear all data
const clearDatabase = () => {
  const db = getDbConnection();
  
  db.exec('DELETE FROM metrics_history');
  db.exec('DELETE FROM seats_history');
  
  db.close();
  console.log('Database cleared successfully');
};

// Show database status
const showStatus = () => {
  if (!fs.existsSync(DB_PATH)) {
    console.log(`Database does not exist at: ${DB_PATH}`);
    return;
  }
  
  const db = getDbConnection();
  
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log(`Database: ${DB_PATH}`);
  console.log('Tables:');
  
  tables.forEach(table => {
    const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
    console.log(`  - ${table.name}: ${count.count} records`);
  });
  
  db.close();
};

// Main function to handle commands
const main = () => {
  const command = process.argv[2] || 'status';
  
  switch (command) {
    case 'seed':
      generateSampleData();
      break;
    case 'clear':
      clearDatabase();
      break;
    case 'status':
      showStatus();
      break;
    default:
      console.log('Unknown command. Available commands: seed, clear, status');
  }
};

// Execute main function
main();