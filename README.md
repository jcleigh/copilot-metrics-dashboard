# GitHub Copilot Metrics - Dashboard

1. [Introduction](#introduction)
1. [Deploy to AWS](#deploy-to-aws)

# Introduction

The GitHub Copilot Metrics Dashboard is a solution accelerator designed to visualize metrics from GitHub Copilot using the [GitHub Copilot Metrics API](https://docs.github.com/en/enterprise-cloud@latest/rest/copilot/copilot-metrics?apiVersion=2022-11-28) and [GitHub Copilot User Management API](https://docs.github.com/en/enterprise-cloud@latest/rest/copilot/copilot-user-management?apiVersion=2022-11-28).

## Dashboard

![GitHub Copilot Metrics - Dashboard](/docs/dashboard.jpeg "GitHub Copilot Metrics - Dashboard")

The dashboard showcases a range of features:

**Filters:**
Ability to filter metrics by date range, languages, code editors and visualise data by time frame (daily, weekly, monthly).

**Acceptance Average:** Percentage of suggestions accepted by users for given date range and group by time range (daily, weekly, monthly).

**Active Users:** Number of active users for the last cycle.

**Adoption Rate:** Number of active users who are using GitHub Copilot in relation to the total number of licensed users.

**Seat Information:** Number of active, inactive, and total users.

**Language:** Breakdown of languages which can be used to filter the data.

**Code Editors:** Breakdown of code editors which can be used to filter the data.

## Seats

Seats feature shows the list of user having a Copilot licence assigned.
This feature is can be enabled or disabled by setting the `ENABLE_SEATS_FEATURE` environment variable to `true` or `false` respectively (default value is `true`).

> Assigned seats ingestion is enabled by default, is possbile to disable by setting the `ENABLE_SEATS_INGESTION` environment variable to `false`



#### Prerequisites

You will be prompted to provide the following information:

```
- GitHub Enterprise name
- GitHub Organization name
- GitHub Token
- GitHub API Scope
- Team Names
```

> More details here for the [GA Metrics API](https://github.blog/changelog/2024-10-30-github-copilot-metrics-api-ga-release-now-available/)

> Team Names must be a valid JSON array, e.g. ``["team-1", "team-2]``

GitHub API Scope define the GITHUB_API_SCOPE environment variable that can be "enterprise" or "organization". It is used to define at which level the GitHub APIs will gather data. If not specified, the default value is "organization".

# Deploy to AWS

The solution can also be deployed on AWS infrastructure using a similar architecture utilizing AWS Lambda, Amazon DynamoDB, Amazon S3, and AWS Secrets Manager. The AWS deployment template will automatically provision the necessary resources and configure the required environment variables.

![GitHub Copilot Metrics - AWS Architecture ](/docs/CopilotDashboardAWS.png "GitHub Copilot Metrics - AWS Architecture")

#### Prerequisites

You will need:
```
- AWS Account ID
- AWS Region
- GitHub Token
- GitHub API Scope
- Team Names (if you choose to use the new metrics API)
```

> More details here for the [GA Metrics API](https://github.blog/changelog/2024-10-30-github-copilot-metrics-api-ga-release-now-available/)

> Team Names must be a valid JSON array, e.g. ``["team-1", "team-2]``

GitHub API Scope define the GITHUB_API_SCOPE environment variable that can be "enterprise" or "organization". It is used to define at which level the GitHub APIs will gather data. If not specified, the default value is "organization".

1. Download the [AWS CLI](https://aws.amazon.com/cli/)
2. If you have not cloned this repo, run `aws init -t jcleigh/copilot-metrics-dashboard`. If you have cloned this repo, just run 'aws init' from the repo root directory.
3. Run `aws up` to provision and deploy the application

```sh
aws init -t jcleigh/copilot-metrics-dashboard
aws up

# if you are wanting to see logs run with debug flag
aws up --debug
```

