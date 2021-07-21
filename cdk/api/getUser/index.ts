import {
  PostAuthenticationTriggerEvent,
  Context,
  APIGatewayProxyEventBase,
  APIGatewayProxyEventPathParameters,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { CognitoIdentityServiceProvider } from 'aws-sdk';
import { LambdaResponse } from '../shared/classes/LambdaResponse';
import { createError } from '../utils';

const cognito = new CognitoIdentityServiceProvider();

export const handler = async (
  event: APIGatewayProxyEventBase<{ uuid: string; email: string }>,
  _context: Context
): Promise<APIGatewayProxyResultV2> => {
  if (!process.env.USER_POOL_ID) {
    return createError({
      message: 'User Pool ID not provided!',
      statusCode: 500,
    });
  }

  const { username }: APIGatewayProxyEventPathParameters =
    event.pathParameters || {};

  if (!username) {
    return createError({
      message: 'Must provide player and hunt IDs!',
      statusCode: 400,
    });
  }

  let user: CognitoIdentityServiceProvider.AdminGetUserResponse;
  try {
    user = await cognito
      .adminGetUser({
        UserPoolId: process.env.USER_POOL_ID,
        Username: username,
      })
      .promise();
  } catch (err) {
    return createError(err);
  }

  return new LambdaResponse(200, user);
};
