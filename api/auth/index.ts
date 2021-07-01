import {
  APIGatewayEventDefaultAuthorizerContext,
  APIGatewayEventLambdaAuthorizerContext,
  APIGatewayTokenAuthorizerEvent,
  AuthResponse,
  Callback,
} from 'aws-lambda';
import jwt_decode from 'jwt-decode';

/**
 * Token payload from Cognito
 */
interface DecodedToken {
  at_hash: string;
  sub: string;
  'cognito:groups': string[];
  email_verified: boolean;
  address: {
    formatted: string;
  };
  iss: string;
  'cognito:username': string;
  origin_jti: string;
  aud: string;
  event_id: string;
  token_use: string;
  auth_time: number;
  exp: number;
  iat: number;
  jti: string;
  email: string;
}

export const handler = function (
  event: APIGatewayTokenAuthorizerEvent,
  _context: APIGatewayEventLambdaAuthorizerContext<APIGatewayEventDefaultAuthorizerContext>,
  callback: Callback
) {
  let decoded: DecodedToken = jwt_decode(event.authorizationToken);

  console.log('Method ARN: ' + event.methodArn);

  callback(
    null,
    generatePolicy(decoded.sub, 'allow', decoded['cognito:groups'])
  );
};

/**
 * Resources (API Gateway ARNs) that each Cognito Group can access
 */
const resources: { [group: string]: string[] } = {
  Players: [
    `arn:aws:execute-api:us-east-1:172877052175:${process.env.apiId}/*/GET/api/hunts`,
  ],
};

/**
 * Helper function to generate an IAM policy
 * @param principalId UUID of user making API request
 * @param effect allow | deny
 * @param group Players | Admins | Developers
 * @returns Auth Response, including IAM policy
 */
const generatePolicy = (
  principalId: string,
  effect: string,
  group: string[]
) => {
  const authResponse: AuthResponse = {
    principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [],
    },
    context: {
      uuid: principalId,
    },
  };

  const allowedResources = group.reduce(
    (prev, curr) => (resources[curr] ? [...prev, ...resources[curr]] : prev),
    new Array<string>()
  );

  console.log(allowedResources);

  authResponse.policyDocument.Statement[0] = {
    ...{ Action: 'execute-api:Invoke' },
    ...(effect && allowedResources.length > 0
      ? {
          Effect: effect,
          Resource: allowedResources,
        }
      : {
          Effect: 'deny',
          Resource: '*',
        }),
  };

  console.log(authResponse);

  return authResponse;
};
