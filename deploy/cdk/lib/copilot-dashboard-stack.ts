import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as ecrAssets from 'aws-cdk-lib/aws-ecr-assets';
import * as path from 'path';

export interface CopilotDashboardStackProps extends cdk.StackProps {
  environment: string;
  githubOrganization: string;
  githubApiVersion: string;
  githubApiScope: string;
  imageTag: string;
  taskCpu: number;
  taskMemory: number;
  dockerDirectory?: string;
}

export class CopilotDashboardStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: CopilotDashboardStackProps) {
    super(scope, id, props);

    // Get default VPC
    const vpc = ec2.Vpc.fromLookup(this, 'DefaultVpc', { isDefault: true });
    
    // Get docker directory from props or context
    const dockerDirectory = props.dockerDirectory || 
      this.node.tryGetContext('dockerDirectory') || 
      '../../src/background';
    
    // Build Docker image as part of CDK deployment
    const dockerImage = new ecrAssets.DockerImageAsset(this, 'CopilotMetricsImage', {
      directory: path.resolve(__dirname, dockerDirectory),
      buildArgs: {
        // Add build args if needed
      }
    });
    
    // Import existing GitHub token from Secrets Manager
    const githubTokenSecret = secretsmanager.Secret.fromSecretNameV2(
      this, 
      'GitHubTokenSecret', 
      'github_metrics_token'
    );
    
    // Create DynamoDB tables
    const metricsHistoryTable = new dynamodb.Table(this, 'MetricsHistoryTable', {
      tableName: `copilot-metrics-history-${props.environment}`,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'date', type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      updateReplacePolicy: cdk.RemovalPolicy.RETAIN,
      deletionProtection: true,
    });
    
    metricsHistoryTable.addGlobalSecondaryIndex({
      indexName: 'DateIndex',
      partitionKey: { name: 'date', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });
    
    cdk.Tags.of(metricsHistoryTable).add('Environment', props.environment);
    
    const seatsHistoryTable = new dynamodb.Table(this, 'SeatsHistoryTable', {
      tableName: `copilot-seats-history-${props.environment}`,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'date', type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      updateReplacePolicy: cdk.RemovalPolicy.RETAIN,
      deletionProtection: true,
    });
    
    seatsHistoryTable.addGlobalSecondaryIndex({
      indexName: 'DateIndex',
      partitionKey: { name: 'date', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });
    
    cdk.Tags.of(seatsHistoryTable).add('Environment', props.environment);

    // Create logs
    const logGroup = new logs.LogGroup(this, 'LogGroup', {
      logGroupName: `/aws/ecs/copilot-data-ingestion-${props.environment}`,
      retention: logs.RetentionDays.TWO_WEEKS,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    
    cdk.Tags.of(logGroup).add('Environment', props.environment);
    
    // Create IAM roles
    const taskExecutionRole = new iam.Role(this, 'TaskExecutionRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy')
      ],
    });
    
    githubTokenSecret.grantRead(taskExecutionRole);
    cdk.Tags.of(taskExecutionRole).add('Environment', props.environment);
    
    const taskRole = new iam.Role(this, 'TaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });
    
    metricsHistoryTable.grantReadWriteData(taskRole);
    seatsHistoryTable.grantReadWriteData(taskRole);
    cdk.Tags.of(taskRole).add('Environment', props.environment);
    
    // Create ECS Cluster
    const cluster = new ecs.Cluster(this, 'EcsCluster', {
      clusterName: `copilot-dashboard-${props.environment}`,
      vpc,
    });
    
    cdk.Tags.of(cluster).add('Environment', props.environment);
    
    // Create security group for Fargate tasks
    const taskSecurityGroup = new ec2.SecurityGroup(this, 'TaskSecurityGroup', {
      vpc,
      description: 'Security group for Copilot Data Ingestion Fargate tasks',
      allowAllOutbound: true,
    });
    
    cdk.Tags.of(taskSecurityGroup).add('Environment', props.environment);
    
    // Create Fargate task definition
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDefinition', {
      family: `copilot-data-ingestion-${props.environment}`,
      cpu: props.taskCpu,
      memoryLimitMiB: props.taskMemory,
      executionRole: taskExecutionRole,
      taskRole: taskRole,
    });
    
    // Add container to task - use the Docker asset instead of ECR repository
    const container = taskDefinition.addContainer('copilot-data-ingestion', {
      image: ecs.ContainerImage.fromDockerImageAsset(dockerImage),
      essential: true,
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'copilot-data-ingestion',
        logGroup,
      }),
      environment: {
        GITHUB_ORGANIZATION: props.githubOrganization,
        GITHUB_API_VERSION: props.githubApiVersion,
        GITHUB_API_SCOPE: props.githubApiScope,
        AWS_REGION: this.region,
        DYNAMODB_LOCAL: 'false',
        GITHUB_TOKEN_SECRET_NAME: 'github_metrics_token',
      },
      secrets: {
        GITHUB_TOKEN: ecs.Secret.fromSecretsManager(githubTokenSecret),
      },
    });
    
    // Create EventBridge rule to run task on a schedule
    const eventsRole = new iam.Role(this, 'EventsRole', {
      assumedBy: new iam.ServicePrincipal('events.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy')
      ],
    });
    
    eventsRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['ecs:RunTask'],
        resources: [taskDefinition.taskDefinitionArn],
      })
    );
    
    eventsRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['iam:PassRole'],
        resources: ['*'],
        conditions: {
          StringLike: {
            'iam:PassedToService': 'ecs-tasks.amazonaws.com',
          },
        },
      })
    );
    
    const scheduledRule = new events.Rule(this, 'ScheduledRule', {
      description: 'Rule to run the Copilot Data Ingestion task on a schedule',
      schedule: events.Schedule.rate(cdk.Duration.hours(1)), //TODO: change to daily
    });
    
    scheduledRule.addTarget(
      new targets.EcsTask({
        cluster,
        taskDefinition,
        taskCount: 1,
        subnetSelection: { subnets: vpc.publicSubnets },
        securityGroups: [taskSecurityGroup],
        role: eventsRole,
      })
    );
    
    // Export outputs
    new cdk.CfnOutput(this, 'MetricsTableName', {
      description: 'DynamoDB Metrics History Table Name',
      value: metricsHistoryTable.tableName,
      exportName: `${this.stackName}-MetricsTableName`,
    });
    
    new cdk.CfnOutput(this, 'SeatsTableName', {
      description: 'DynamoDB Seats History Table Name',
      value: seatsHistoryTable.tableName,
      exportName: `${this.stackName}-SeatsTableName`,
    });
    
    new cdk.CfnOutput(this, 'ClusterName', {
      description: 'Name of the ECS Cluster',
      value: cluster.clusterName,
      exportName: `${this.stackName}-ClusterName`,
    });
    
    // Output the repository URI for reference
    new cdk.CfnOutput(this, 'DockerImageUri', {
      description: 'URI of the built Docker image',
      value: dockerImage.imageUri,
      exportName: `${this.stackName}-DockerImageUri`,
    });
  }
}
