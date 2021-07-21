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

  callback(
    null,
    generatePolicy(
      decoded.sub,
      decoded.email,
      'allow',
      decoded['cognito:groups']
    )
  );
};

/**
 * Generate Resources (API Gateway ARNs) that each user can access
 * @param playerId UUID of player
 * @param groups Cognito Groups that user belongs to
 * @returns Array of Resource ARNs
 */
const generateResources = (playerId: string, groups: string[]): string[] => {
  return groups.reduce((prev, curr) => {
    let resources: string[];
    switch (curr) {
      case 'Players':
        resources = [
          `arn:aws:execute-api:us-east-1:172877052175:${process.env.apiId}/*/GET/api/players/${playerId}/hunts`,
          `arn:aws:execute-api:us-east-1:172877052175:${process.env.apiId}/*/GET/api/players/${playerId}/hunts/*`,
          `arn:aws:execute-api:us-east-1:172877052175:${process.env.apiId}/*/PUT/api/players/${playerId}/hunts/*`,
        ];
        break;
      case 'Admins':
        resources = [
          `arn:aws:execute-api:us-east-1:172877052175:${process.env.apiId}/*/GET/api/hunts`,
          `arn:aws:execute-api:us-east-1:172877052175:${process.env.apiId}/*/POST/api/hunts`,
          `arn:aws:execute-api:us-east-1:172877052175:${process.env.apiId}/*/GET/api/users/*`,
        ];
        break;
      case 'Developers':
        resources = [
          `arn:aws:execute-api:us-east-1:172877052175:${process.env.apiId}/*/GET/api/hunts`,
        ];
        break;
      default:
        resources = [];
    }
    return [...prev, ...resources];
  }, new Array<string>());
};

/**
 * Helper function to generate an IAM policy
 * @param principalId UUID of user making API request
 * @param effect allow | deny
 * @param groups Players | Admins | Developers
 * @returns Auth Response, including IAM policy
 */
const generatePolicy = (
  principalId: string,
  email: string,
  effect: string,
  groups: string[]
) => {
  const authResponse: AuthResponse = {
    principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [],
    },
    context: {
      uuid: principalId,
      email,
    },
  };

  const allowedResources = generateResources(principalId, groups);

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

  return authResponse;
};
