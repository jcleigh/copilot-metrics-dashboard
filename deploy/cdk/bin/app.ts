#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CopilotDashboardStack } from '../lib/copilot-dashboard-stack';

const app = new cdk.App();

// Get environment variables or use defaults
const environment = app.node.tryGetContext('environment') || 'dev';
const githubOrg = app.node.tryGetContext('githubOrg') || 'FMGSuite';
const githubApiVersion = app.node.tryGetContext('githubApiVersion') || '2022-11-28';
const githubApiScope = app.node.tryGetContext('githubApiScope') || 'organization';
const imageTag = app.node.tryGetContext('imageTag') || 'latest';
const taskCpu = app.node.tryGetContext('taskCpu') || 256;
const taskMemory = app.node.tryGetContext('taskMemory') || 512;

new CopilotDashboardStack(app, 'CopilotDashboard', {
  stackName: `copilot-dashboard-${environment}`,
  environment,
  githubOrganization: githubOrg,
  githubApiVersion,
  githubApiScope,
  imageTag,
  taskCpu,
  taskMemory,
  description: 'GitHub Copilot Dashboard - Fargate and DynamoDB Resources',
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  }
});

app.synth();
