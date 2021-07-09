import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as lambdaNode from '@aws-cdk/aws-lambda-nodejs';
import * as path from 'path';
import * as apigw from '@aws-cdk/aws-apigateway';
import * as s3 from '@aws-cdk/aws-s3';
import * as s3Deployment from '@aws-cdk/aws-s3-deployment';
import * as cloudfront from '@aws-cdk/aws-cloudfront';
import * as iam from '@aws-cdk/aws-iam';
import * as cognito from '@aws-cdk/aws-cognito';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import { ProjectionType, TableEncryption } from '@aws-cdk/aws-dynamodb';
import { Duration } from '@aws-cdk/core';

export class Ab3TreasureHuntStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ============================================================
    // Cognito User Pool
    // ============================================================

    const userPool = new cognito.UserPool(this, id + 'Pool', {
      signInAliases: {
        email: true,
      },
      autoVerify: {
        email: true,
      },
      passwordPolicy: {
        tempPasswordValidity: Duration.days(7),
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      signInCaseSensitive: false,
      selfSignUpEnabled: true,
    });

    new cognito.CfnUserPoolGroup(this, 'PlayersGroup', {
      groupName: 'Players',
      userPoolId: userPool.userPoolId,
    });

    new cognito.CfnUserPoolGroup(this, 'AdminsGroup', {
      groupName: 'Admins',
      userPoolId: userPool.userPoolId,
    });

    const userPoolClient = new cognito.UserPoolClient(this, id + 'PoolClient', {
      userPool,
      supportedIdentityProviders: [
        cognito.UserPoolClientIdentityProvider.COGNITO,
      ],
      userPoolClientName: 'Web',
      authFlows: {
        userSrp: true,
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
        },
        scopes: [
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.PROFILE,
        ],
        callbackUrls: ['http://localhost:3000'],
        logoutUrls: ['http://localhost:3000'],
      },
      generateSecret: false,
      refreshTokenValidity: Duration.days(30),
      accessTokenValidity: Duration.hours(12),
      idTokenValidity: Duration.hours(12),
    });

    const userPoolDomain = new cognito.UserPoolDomain(
      this,
      id + 'UserPoolDomain',
      {
        cognitoDomain: {
          domainPrefix: 'ab3-treasure-hunt',
        },
        userPool,
      }
    );

    // ============================================================
    // DynamoDB Tables
    // ============================================================

    const playerHuntsTable = new dynamodb.Table(this, 'PlayerHuntsTable', {
      partitionKey: {
        name: 'PlayerID',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'HuntID',
        type: dynamodb.AttributeType.STRING,
      },
      readCapacity: 5,
      writeCapacity: 5,
      encryption: TableEncryption.AWS_MANAGED,
    });

    playerHuntsTable.addGlobalSecondaryIndex({
      indexName: 'PlayerHuntTypeIndex',
      partitionKey: {
        name: 'PlayerID',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'HuntTypeTime',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: ProjectionType.ALL,
    });

    playerHuntsTable.addGlobalSecondaryIndex({
      indexName: 'HuntTypeIndex',
      partitionKey: {
        name: 'HuntType',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'HuntTypeTime',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: ProjectionType.ALL,
    });

    playerHuntsTable.addGlobalSecondaryIndex({
      indexName: 'CreatedAtIndex',
      partitionKey: {
        name: 'CreatedYear',
        type: dynamodb.AttributeType.NUMBER,
      },
      sortKey: {
        name: 'CreatedAt',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: ProjectionType.ALL,
    });

    playerHuntsTable.addGlobalSecondaryIndex({
      indexName: 'CreatedByIndex',
      partitionKey: {
        name: 'CreatedBy',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'CreatedAt',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: ProjectionType.ALL,
    });
    const playersTable = new dynamodb.Table(this, 'PlayersTable', {
      partitionKey: {
        name: 'Email',
        type: dynamodb.AttributeType.STRING,
      },
      readCapacity: 5,
      writeCapacity: 5,
      encryption: TableEncryption.AWS_MANAGED,
    });

    // ============================================================
    // API Integration Lambdas
    // ============================================================

    const apiDefaultHandler = new lambdaNode.NodejsFunction(
      this,
      'apiDefaultHandler',
      {
        runtime: lambda.Runtime.NODEJS_14_X,
        entry: path.join(__dirname, '../api/default/index.ts'),
        memorySize: 512,
      }
    );

    const getPlayerHuntsHandler = new lambdaNode.NodejsFunction(
      this,
      'getPlayerHuntsHandler',
      {
        runtime: lambda.Runtime.NODEJS_14_X,
        entry: path.join(__dirname, '../api/getPlayerHunts/index.ts'),
        memorySize: 512,
        environment: {
          PLAYER_HUNTS_TABLE: playerHuntsTable.tableName,
        },
      }
    );

    const getPlayerHuntHandler = new lambdaNode.NodejsFunction(
      this,
      'getPlayerHuntHandler',
      {
        runtime: lambda.Runtime.NODEJS_14_X,
        entry: path.join(__dirname, '../api/getPlayerHunt/index.ts'),
        memorySize: 512,
        environment: {
          PLAYER_HUNTS_TABLE: playerHuntsTable.tableName,
        },
      }
    );

    const updatePlayerHuntHandler = new lambdaNode.NodejsFunction(
      this,
      'updatePlayerHuntHandler',
      {
        runtime: lambda.Runtime.NODEJS_14_X,
        entry: path.join(__dirname, '../api/updatePlayerHunt/index.ts'),
        memorySize: 512,
        environment: {
          PLAYER_HUNTS_TABLE: playerHuntsTable.tableName,
        },
      }
    );

    const getHuntsHandler = new lambdaNode.NodejsFunction(
      this,
      'getHuntsHandler',
      {
        runtime: lambda.Runtime.NODEJS_14_X,
        entry: path.join(__dirname, '../api/getHunts/index.ts'),
        memorySize: 512,
        environment: {
          PLAYER_HUNTS_TABLE: playerHuntsTable.tableName,
        },
      }
    );

    const createHuntHandler = new lambdaNode.NodejsFunction(
      this,
      'createHuntHandler',
      {
        runtime: lambda.Runtime.NODEJS_14_X,
        entry: path.join(__dirname, '../api/createHunt/index.ts'),
        memorySize: 512,
        environment: {
          PLAYER_HUNTS_TABLE: playerHuntsTable.tableName,
          PLAYERS_TABLE: playersTable.tableName,
        },
      }
    );

    // grant read/write permission to DynamoDB tables
    playerHuntsTable.grantReadWriteData(getPlayerHuntsHandler);
    playerHuntsTable.grantReadWriteData(getPlayerHuntHandler);
    playerHuntsTable.grantReadWriteData(updatePlayerHuntHandler);
    playerHuntsTable.grantReadWriteData(getHuntsHandler);
    playerHuntsTable.grantReadWriteData(createHuntHandler);
    playersTable.grantReadWriteData(createHuntHandler);

    // ============================================================
    // API Gateway
    // ============================================================

    const apiGateway = new apigw.LambdaRestApi(this, 'apiGateway', {
      handler: apiDefaultHandler,
      proxy: false,
    });

    const apiAuthorizerHandler = new lambdaNode.NodejsFunction(
      this,
      'apiAuthorizerHandler',
      {
        runtime: lambda.Runtime.NODEJS_14_X,
        entry: path.join(__dirname, '../api/auth/index.ts'),
        memorySize: 512,
        environment: {
          apiId: apiGateway.restApiId,
        },
      }
    );

    const authorizer = new apigw.TokenAuthorizer(this, 'authorizer', {
      handler: apiAuthorizerHandler,
      resultsCacheTtl: Duration.seconds(0),
    });

    // ==> /api
    const apiRoute = apiGateway.root.addResource('api');

    const playersRoute = apiRoute.addResource('players');
    const playerRoute = playersRoute.addResource('{player}');

    // ==> /api/players/{player}/hunts
    const playerHunts = playerRoute.addResource('hunts');
    playerHunts.addMethod(
      'GET',
      new apigw.LambdaIntegration(getPlayerHuntsHandler),
      { authorizer }
    );

    // ==> /api/players/{player}/hunts/{hunt}
    const playerHunt = playerHunts.addResource('{hunt}');
    playerHunt.addMethod(
      'GET',
      new apigw.LambdaIntegration(getPlayerHuntHandler),
      { authorizer }
    );
    playerHunt.addMethod(
      'PUT',
      new apigw.LambdaIntegration(updatePlayerHuntHandler),
      { authorizer }
    );

    // ==> /api/hunts
    const huntsRoute = apiRoute.addResource('hunts');
    huntsRoute.addMethod('GET', new apigw.LambdaIntegration(getHuntsHandler), {
      authorizer,
    });
    huntsRoute.addMethod(
      'POST',
      new apigw.LambdaIntegration(createHuntHandler),
      {
        authorizer,
      }
    );

    // ============================================================
    // S3 Static Website Hosting
    // ============================================================

    const uiBucket = new s3.Bucket(this, 'uiBucket', {
      encryption: s3.BucketEncryption.S3_MANAGED,
      lifecycleRules: [
        { abortIncompleteMultipartUploadAfter: cdk.Duration.days(7) },
        { noncurrentVersionExpiration: cdk.Duration.days(7) },
      ],
      blockPublicAccess: {
        blockPublicAcls: true,
        blockPublicPolicy: true,
        ignorePublicAcls: true,
        restrictPublicBuckets: true,
      },
      versioned: true,
    });

    new s3Deployment.BucketDeployment(this, 'uiBucketDeployment', {
      sources: [
        s3Deployment.Source.asset(path.join(__dirname, '../../ui/build')),
      ],
      destinationKeyPrefix: '/',
      destinationBucket: uiBucket,
    });

    // ============================================================
    // CloudFront to S3
    // ============================================================

    const cfOriginAccessIdentity = new cloudfront.OriginAccessIdentity(
      this,
      'cfOriginAccessIdentity',
      {}
    );

    const cfS3Access = new iam.PolicyStatement();
    cfS3Access.addActions('s3:GetBucket*');
    cfS3Access.addActions('s3:GetObject*');
    cfS3Access.addActions('s3:List*');
    cfS3Access.addResources(uiBucket.bucketArn);
    cfS3Access.addResources(`${uiBucket.bucketArn}/*`);
    cfS3Access.addCanonicalUserPrincipal(
      cfOriginAccessIdentity.cloudFrontOriginAccessIdentityS3CanonicalUserId
    );
    uiBucket.addToResourcePolicy(cfS3Access);

    const distribution = new cloudfront.CloudFrontWebDistribution(
      this,
      'webDistribution',
      {
        originConfigs: [
          {
            s3OriginSource: {
              s3BucketSource: uiBucket,
              originAccessIdentity: cfOriginAccessIdentity,
            },
            behaviors: [
              {
                isDefaultBehavior: true,
              },
            ],
          },
        ],
      }
    );

    // ============================================================
    // Outputs
    // ============================================================

    new cdk.CfnOutput(this, 'distributionDomainName', {
      value: distribution.distributionDomainName,
    });

    new cdk.CfnOutput(this, 'apiGatewayDomainName', {
      value: apiGateway.url,
    });

    new cdk.CfnOutput(this, 'cognitoUserPoolId', {
      value: userPool.userPoolId,
    });

    new cdk.CfnOutput(this, 'cognitoUserPoolClientId', {
      value: userPoolClient.userPoolClientId,
    });

    new cdk.CfnOutput(this, 'cognitoUserPoolDomain', {
      value: userPoolDomain.domainName,
    });
  }
}
