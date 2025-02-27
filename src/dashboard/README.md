This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, install the dependencies:

```bash
npm install
# or
yarn
# or
pnpm install
# or
bun install
```

### Local Development Setup

This project can run completely locally without requiring Azure cloud services:

1. Copy the `.env.local` file and update it with your GitHub credentials:
   ```bash
   # No need to change these for local development with sample data
   USE_LOCAL_DB=true
   LOCAL_DB_PATH=./data/copilot-metrics.db
   
   # Update these with your actual GitHub values if you want to fetch real data
   GITHUB_ORGANIZATION=your-organization
   GITHUB_ENTERPRISE=your-enterprise
   GITHUB_TOKEN=your-github-token
   GITHUB_API_VERSION=2022-11-28
   GITHUB_API_SCOPE=organization
   ```

2. Seed the local database with sample data:
   ```bash
   npm run db:seed
   # or
   yarn db:seed
   ```

3. Run the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   # or
   bun dev
   ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Database Management

The application uses a local SQLite database by default. You can manage it using these commands:

```bash
# Seed the database with sample data
npm run db:seed

# Clear all data from the database
npm run db:clear

# Check database status and record counts
npm run db:status
```

The database is stored in the `./data` directory by default but can be configured via the `LOCAL_DB_PATH` environment variable.

## Architecture

This application uses:
- NextJS for the frontend and API routes
- SQLite for local data storage (instead of Azure CosmosDB)
- GitHub API for fetching Copilot metrics and seat data

You can modify the code to switch back to using Azure services by setting:
```
USE_LOCAL_DB=false
```
in your `.env.local` file and providing Azure CosmosDB credentials.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
