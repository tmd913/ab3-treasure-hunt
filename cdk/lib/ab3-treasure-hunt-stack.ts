import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as path from 'path';
import * as apigw from '@aws-cdk/aws-apigateway';
import * as s3 from '@aws-cdk/aws-s3';
import * as s3Deployment from '@aws-cdk/aws-s3-deployment';
import * as cloudfront from '@aws-cdk/aws-cloudfront';
import * as iam from '@aws-cdk/aws-iam';
import { Duration } from '@aws-cdk/core';

export class Ab3TreasureHuntStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const apiDefaultHandler = new lambda.Function(this, 'apiDefaultHandler', {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../api/default')),
      memorySize: 512,
    });

    const apiHelloHandler = new lambda.Function(this, 'apiHelloHandler', {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../api/hello')),
      memorySize: 512,
    });

    const apiGateway = new apigw.LambdaRestApi(this, 'apiGateway', {
      handler: apiDefaultHandler,
      proxy: false,
    });

    const apiRoute = apiGateway.root.addResource('api');

    const apiHelloRoute = apiRoute.addResource('hello');
    apiHelloRoute.addMethod(
      'GET',
      new apigw.LambdaIntegration(apiHelloHandler)
    );

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
            customOriginSource: {
              domainName: `${apiGateway.restApiId}.execute-api.${this.region}.${this.urlSuffix}`,
            },
            originPath: `/${apiGateway.deploymentStage.stageName}`,
            behaviors: [
              {
                allowedMethods: cloudfront.CloudFrontAllowedMethods.ALL,
                pathPattern: 'api/*',
                defaultTtl: Duration.millis(0),
                minTtl: Duration.millis(0),
                maxTtl: Duration.millis(0),
              },
            ],
          },
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

    new cdk.CfnOutput(this, 'distributionDomainName', {
      value: distribution.distributionDomainName,
    });
  }
}
