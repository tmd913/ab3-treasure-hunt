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
import * as location from '@aws-cdk/aws-location';
import { ProjectionType, TableEncryption } from '@aws-cdk/aws-dynamodb';
import { Duration } from '@aws-cdk/core';
import { HttpMethods } from '@aws-cdk/aws-s3';

export class Ab3TreasureHuntStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

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
        errorConfigurations: [
          {
            errorCode: 404,
            responseCode: 200,
            responsePagePath: '/index.html',
          },
        ],
      }
    );

    // ============================================================
    // Amazon Location Service
    // ============================================================

    const map = new location.CfnMap(this, 'Map', {
      mapName: id + 'TreasureMap',
      pricingPlan: 'RequestBasedUsage',
      description: 'Map used to for treasure hunts',
      configuration: {
        style: 'VectorEsriStreets',
      },
    });

    const placeIndex = new location.CfnPlaceIndex(this, 'PlaceIndex', {
      indexName: id + 'PlaceIndex',
      pricingPlan: 'RequestBasedUsage',
      dataSource: 'Esri',
    });

    // ============================================================
    // S3 Treasure Images
    // ============================================================

    const treasureBucket = new s3.Bucket(this, 'treasureBucket', {
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
      cors: [
        {
          allowedHeaders: ['*'],
          allowedMethods: [
            HttpMethods.GET,
            HttpMethods.HEAD,
            HttpMethods.PUT,
            HttpMethods.POST,
            HttpMethods.DELETE,
          ],
          allowedOrigins: ['*'],
          exposedHeaders: [
            'x-amz-server-side-encryption',
            'x-amz-request-id',
            'x-amz-id-2',
            'ETag',
          ],
          maxAge: 3000,
        },
      ],
    });

    // ============================================================
    // Cognito User Pool
    // ============================================================

    const postConfirmationHandler = new lambdaNode.NodejsFunction(
      this,
      'postConfirmationHandler',
      {
        runtime: lambda.Runtime.NODEJS_14_X,
        entry: path.join(__dirname, '../cognito/postConfirmation/index.ts'),
        memorySize: 512,
      }
    );

    const userPool = new cognito.UserPool(this, id + 'Pool', {
      signInAliases: {
        email: true,
      },
      autoVerify: {
        email: true,
      },
      customAttributes: {
        zipCode: new cognito.StringAttribute({
          minLen: 5,
          maxLen: 5,
          mutable: true,
        }),
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
      lambdaTriggers: {
        postConfirmation: postConfirmationHandler,
      },
    });

    const cognitoAccess = new iam.PolicyStatement();
    cognitoAccess.addActions('cognito-idp:AdminAddUserToGroup');
    cognitoAccess.addResources(userPool.userPoolArn);

    // workaround to avoid circular dependency between user pool and post confirmation lambda
    postConfirmationHandler.role?.attachInlinePolicy(
      new iam.Policy(this, 'UserPoolPolicy', {
        statements: [cognitoAccess],
      })
    );

    const userPoolClient = new cognito.UserPoolClient(this, id + 'PoolClient', {
      userPool,
      supportedIdentityProviders: [
        cognito.UserPoolClientIdentityProvider.COGNITO,
      ],
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
          cognito.OAuthScope.COGNITO_ADMIN,
        ],
        callbackUrls: [
          `https://${distribution.distributionDomainName}`,
          'http://localhost:3000',
        ],
        logoutUrls: [
          `https://${distribution.distributionDomainName}`,
          'http://localhost:3000',
        ],
      },
      generateSecret: false,
      refreshTokenValidity: Duration.days(30),
      accessTokenValidity: Duration.hours(1),
      idTokenValidity: Duration.hours(1),
      preventUserExistenceErrors: true,
    });

    const userPoolDomain = new cognito.UserPoolDomain(
      this,
      id + 'UserPoolDomain',
      {
        cognitoDomain: {
          domainPrefix: 'ab3-treasure-hunt-sgc',
        },
        userPool,
      }
    );

    const identityPool = new cognito.CfnIdentityPool(
      this,
      id + 'IdentityPool',
      {
        allowUnauthenticatedIdentities: false,
        cognitoIdentityProviders: [
          {
            clientId: userPoolClient.userPoolClientId,
            providerName: userPool.userPoolProviderName,
          },
        ],
        allowClassicFlow: false,
      }
    );

    const defaultIdentityStatement = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'mobileanalytics:PutEvents',
        'cognito-sync:*',
        'cognito-identity:*',
      ],
      resources: ['*'],
    });

    const authPrincipal = new iam.FederatedPrincipal(
      'cognito-identity.amazonaws.com',
      {
        StringEquals: {
          'cognito-identity.amazonaws.com:aud': identityPool.ref,
        },
        'ForAnyValue:StringLike': {
          'cognito-identity.amazonaws.com:amr': 'authenticated',
        },
      },
      'sts:AssumeRoleWithWebIdentity'
    );

    const defaultAuthCognitoRole = new iam.Role(this, 'DefaultAuthRole', {
      description: 'Default authenticated role',
      assumedBy: authPrincipal,
      inlinePolicies: {
        defaultAuthPolicy: new iam.PolicyDocument({
          statements: [defaultIdentityStatement],
        }),
      },
    });

    const defaultUnauthCognitoRole = new iam.Role(this, 'DefaultUnauthRole', {
      description: 'Default unauthenticated role',
      assumedBy: new iam.FederatedPrincipal(
        'cognito-identity.amazonaws.com',
        {
          StringEquals: {
            'cognito-identity.amazonaws.com:aud': identityPool.ref,
          },
          'ForAnyValue:StringLike': {
            'cognito-identity.amazonaws.com:amr': 'unauthenticated',
          },
        },
        'sts:AssumeRoleWithWebIdentity'
      ),
      inlinePolicies: {
        defaultUnauthPolicy: new iam.PolicyDocument({
          statements: [defaultIdentityStatement],
        }),
      },
    });

    const mapAccessPolicy = new iam.PolicyDocument({
      statements: [
        defaultIdentityStatement,
        new iam.PolicyStatement({
          sid: 'MapsReadOnly',
          effect: iam.Effect.ALLOW,
          actions: [
            'geo:GetMapStyleDescriptor',
            'geo:GetMapGlyphs',
            'geo:GetMapSprites',
            'geo:GetMapTile',
          ],
          resources: [map.attrArn],
        }),
      ],
    });

    const playerRole = new iam.Role(this, 'PlayerRole', {
      description: 'Role for Players group',
      assumedBy: authPrincipal,
      inlinePolicies: {
        mapAccessPolicy,
        s3PlayerViewPolicy: new iam.PolicyDocument({
          statements: [
            defaultIdentityStatement,
            new iam.PolicyStatement({
              sid: 'S3PlayerView',
              effect: iam.Effect.ALLOW,
              actions: ['s3:*'],
              resources: [
                '*',
                // treasureBucket.bucketArn +
                //   '/private/${cognito-identity.amazonaws.com:sub}/*',
              ],
            }),
          ],
        }),
      },
    });

    const adminRole = new iam.Role(this, 'AdminRole', {
      description: 'Role for Players group',
      assumedBy: authPrincipal,
      inlinePolicies: {
        mapAccessPolicy,
        s3AdminPutPolicy: new iam.PolicyDocument({
          statements: [
            defaultIdentityStatement,
            new iam.PolicyStatement({
              sid: 'S3AdminPut',
              effect: iam.Effect.ALLOW,
              actions: ['s3:PutObject'],
              resources: [treasureBucket.bucketArn + '/public/*'],
            }),
          ],
        }),
      },
    });

    new cognito.CfnIdentityPoolRoleAttachment(
      this,
      id + 'IdentityPoolRoleAttachment',
      {
        identityPoolId: identityPool.ref,
        roles: {
          authenticated: defaultAuthCognitoRole.roleArn,
          unauthenticated: defaultUnauthCognitoRole.roleArn,
        },
        roleMappings: {
          mapping: {
            type: 'Token',
            ambiguousRoleResolution: 'AuthenticatedRole',
            identityProvider: `${userPool.userPoolProviderName}:${userPoolClient.userPoolClientId}`,
          },
        },
      }
    );

    new cognito.CfnUserPoolGroup(this, 'PlayersGroup', {
      groupName: 'Players',
      userPoolId: userPool.userPoolId,
      roleArn: playerRole.roleArn,
    });

    new cognito.CfnUserPoolGroup(this, 'AdminsGroup', {
      groupName: 'Admins',
      userPoolId: userPool.userPoolId,
      roleArn: adminRole.roleArn,
    });

    new cognito.CfnUserPoolGroup(this, 'DevsGroup', {
      groupName: 'Devs',
      userPoolId: userPool.userPoolId,
    });

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
        },
      }
    );

    const getUserHandler = new lambdaNode.NodejsFunction(
      this,
      'getUserHandler',
      {
        runtime: lambda.Runtime.NODEJS_14_X,
        entry: path.join(__dirname, '../api/getUser/index.ts'),
        memorySize: 512,
        environment: {
          USER_POOL_ID: userPool.userPoolId,
        },
      }
    );
    const cognitoGetUserAccess = new iam.PolicyStatement();
    cognitoGetUserAccess.addActions('cognito-idp:AdminGetUser');
    cognitoGetUserAccess.addResources(userPool.userPoolArn);
    getUserHandler.addToRolePolicy(cognitoGetUserAccess);

    const updateUserHandler = new lambdaNode.NodejsFunction(
      this,
      'updateUserHandler',
      {
        runtime: lambda.Runtime.NODEJS_14_X,
        entry: path.join(__dirname, '../api/updateUser/index.ts'),
        memorySize: 512,
        environment: {
          USER_POOL_ID: userPool.userPoolId,
        },
      }
    );
    const cognitoUpdateUserAccess = new iam.PolicyStatement();
    cognitoUpdateUserAccess.addActions('cognito-idp:AdminUpdateUserAttributes');
    cognitoUpdateUserAccess.addResources(userPool.userPoolArn);
    updateUserHandler.addToRolePolicy(cognitoUpdateUserAccess);

    const createUserHandler = new lambdaNode.NodejsFunction(
      this,
      'createUserHandler',
      {
        runtime: lambda.Runtime.NODEJS_14_X,
        entry: path.join(__dirname, '../api/createUser/index.ts'),
        memorySize: 512,
        environment: {
          USER_POOL_ID: userPool.userPoolId,
        },
      }
    );
    const cognitoCreateUserAccess = new iam.PolicyStatement();
    cognitoCreateUserAccess.addActions(
      'cognito-idp:AdminCreateUser',
      'cognito-idp:AdminAddUserToGroup'
    );
    cognitoCreateUserAccess.addResources(userPool.userPoolArn);
    createUserHandler.addToRolePolicy(cognitoCreateUserAccess);

    const searchPlaceIndexHandler = new lambdaNode.NodejsFunction(
      this,
      'searchPlaceIndexHandler',
      {
        runtime: lambda.Runtime.NODEJS_14_X,
        entry: path.join(__dirname, '../api/searchPlaceIndex/index.ts'),
        memorySize: 512,
        environment: {
          PLACE_INDEX_NAME: placeIndex.indexName,
        },
      }
    );
    const placeIndexAccess = new iam.PolicyStatement();
    placeIndexAccess.addActions('geo:SearchPlaceIndexForText');
    placeIndexAccess.addResources(placeIndex.attrArn);
    searchPlaceIndexHandler.addToRolePolicy(placeIndexAccess);

    // grant read/write permission to DynamoDB tables
    playerHuntsTable.grantReadWriteData(getPlayerHuntsHandler);
    playerHuntsTable.grantReadWriteData(getPlayerHuntHandler);
    playerHuntsTable.grantReadWriteData(updatePlayerHuntHandler);
    playerHuntsTable.grantReadWriteData(getHuntsHandler);
    playerHuntsTable.grantReadWriteData(createHuntHandler);

    // ============================================================
    // API Gateway
    // ============================================================

    const apiGateway = new apigw.LambdaRestApi(this, 'apiGateway', {
      handler: apiDefaultHandler,
      proxy: false,
      defaultCorsPreflightOptions: {
        allowHeaders: apigw.Cors.DEFAULT_HEADERS,
        allowMethods: apigw.Cors.ALL_METHODS,
        allowOrigins: apigw.Cors.ALL_ORIGINS,
      },
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
    const playerHuntsRoute = playerRoute.addResource('hunts');
    playerHuntsRoute.addMethod(
      'GET',
      new apigw.LambdaIntegration(getPlayerHuntsHandler),
      { authorizer }
    );

    // ==> /api/players/{player}/hunts/{hunt}
    const playerHuntRoute = playerHuntsRoute.addResource('{hunt}');
    playerHuntRoute.addMethod(
      'GET',
      new apigw.LambdaIntegration(getPlayerHuntHandler),
      { authorizer }
    );
    playerHuntRoute.addMethod(
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

    // ==> /api/users/{username}
    const usersRoute = apiRoute.addResource('users');
    usersRoute.addMethod(
      'POST',
      new apigw.LambdaIntegration(createUserHandler),
      { authorizer }
    );

    const userRoute = usersRoute.addResource('{username}');
    userRoute.addMethod('GET', new apigw.LambdaIntegration(getUserHandler), {
      authorizer,
    });
    userRoute.addMethod('PUT', new apigw.LambdaIntegration(updateUserHandler), {
      authorizer,
    });

    // ==> /api/places/{zipCode}
    const placesRoute = apiRoute.addResource('places');
    const placeRoute = placesRoute.addResource('{zipCode}');
    placeRoute.addMethod(
      'GET',
      new apigw.LambdaIntegration(searchPlaceIndexHandler),
      {
        authorizer,
      }
    );

    // ============================================================
    // Outputs
    // ============================================================

    new cdk.CfnOutput(this, 'mapName', {
      value: map.mapName,
    });

    new cdk.CfnOutput(this, 'treasureBucketName', {
      value: treasureBucket.bucketName,
    });

    new cdk.CfnOutput(this, 'distributionDomainName', {
      value: distribution.distributionDomainName,
    });

    new cdk.CfnOutput(this, 'apiGatewayDomainName', {
      value: apiGateway.url,
    });

    new cdk.CfnOutput(this, 'userPoolId', {
      value: userPool.userPoolId,
    });

    new cdk.CfnOutput(this, 'userPoolClientId', {
      value: userPoolClient.userPoolClientId,
    });

    new cdk.CfnOutput(this, 'identityPoolId', {
      value: identityPool.ref,
    });

    new cdk.CfnOutput(this, 'domain', {
      value: userPoolDomain.domainName,
    });
  }
}
