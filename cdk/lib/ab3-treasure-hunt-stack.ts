import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as path from 'path';
import * as apigw from '@aws-cdk/aws-apigateway';
import * as s3 from '@aws-cdk/aws-s3';
import * as s3Deployment from '@aws-cdk/aws-s3-deployment';
import * as cloudfront from '@aws-cdk/aws-cloudfront';
import * as iam from '@aws-cdk/aws-iam';
import * as cognito from '@aws-cdk/aws-cognito';
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
    // API Integration Lambdas
    // ============================================================

    const apiDefaultHandler = new lambda.Function(this, 'apiDefaultHandler', {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../api/default')),
      memorySize: 512,
    });

    const getPlayerHuntsHandler = new lambda.Function(
      this,
      'getPlayerHuntsHandler',
      {
        runtime: lambda.Runtime.NODEJS_14_X,
        handler: 'index.handler',
        code: lambda.Code.fromAsset(
          path.join(__dirname, '../../api/getPlayerHunts')
        ),
        memorySize: 512,
      }
    );

    const getPlayerHuntHandler = new lambda.Function(
      this,
      'getPlayerHuntHandler',
      {
        runtime: lambda.Runtime.NODEJS_14_X,
        handler: 'index.handler',
        code: lambda.Code.fromAsset(
          path.join(__dirname, '../../api/getPlayerHunt')
        ),
        memorySize: 512,
      }
    );

    const updatePlayerHuntHandler = new lambda.Function(
      this,
      'updatePlayerHuntHandler',
      {
        runtime: lambda.Runtime.NODEJS_14_X,
        handler: 'index.handler',
        code: lambda.Code.fromAsset(
          path.join(__dirname, '../../api/updatePlayerHunt')
        ),
        memorySize: 512,
      }
    );

    const getHuntsHandler = new lambda.Function(this, 'getHuntsHandler', {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../api/getHunts')),
      memorySize: 512,
    });

    const createHuntHandler = new lambda.Function(this, 'createHuntHandler', {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../api/createHunt')),
      memorySize: 512,
    });

    const getMapHandler = new lambda.Function(this, 'getMapHandler', {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../api/getMap')),
      memorySize: 512,
    });

    // ============================================================
    // API Gateway
    // ============================================================

    const apiGateway = new apigw.LambdaRestApi(this, 'apiGateway', {
      handler: apiDefaultHandler,
      proxy: false,
    });

    const apiAuthorizerHandler = new lambda.Function(
      this,
      'apiAuthorizerHandler',
      {
        runtime: lambda.Runtime.NODEJS_14_X,
        handler: 'index.handler',
        code: lambda.Code.fromAsset(path.join(__dirname, '../../api/auth')),
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

    // ==> /api/map
    const mapRoute = apiRoute.addResource('map');
    mapRoute.addMethod('GET', new apigw.LambdaIntegration(getMapHandler), {
      authorizer,
    });

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
