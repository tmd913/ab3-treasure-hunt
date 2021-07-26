import {
  Context,
  APIGatewayProxyEventBase,
  APIGatewayProxyEventPathParameters,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { CognitoIdentityServiceProvider } from 'aws-sdk';
import { LambdaResponse } from '../shared/classes/LambdaResponse';
import { createError } from '../utils';

const cognito = new CognitoIdentityServiceProvider();

interface UpdateUserBody {
  zipCode: number;
}

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

  const body: UpdateUserBody = event.body ? JSON.parse(event.body) : null;
  const { zipCode } = body;

  if (!body || zipCode == null) {
    return createError({
      message: 'Must provide request body with zip code!',
      statusCode: 400,
    });
  }

  try {
    await cognito
      .adminUpdateUserAttributes({
        UserPoolId: process.env.USER_POOL_ID,
        Username: username,
        UserAttributes: [
          {
            Name: 'custom:zipCode',
            Value: zipCode.toString(),
          },
        ],
      })
      .promise();
  } catch (err) {
    return createError(err);
  }

  return new LambdaResponse(200, {
    message: 'User attributes updated!',
  });
};
