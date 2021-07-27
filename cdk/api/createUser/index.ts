import {
  Context,
  APIGatewayProxyEventBase,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { CognitoIdentityServiceProvider } from 'aws-sdk';
import { LambdaResponse } from '../shared/classes/LambdaResponse';
import { createError } from '../utils';

const cognito = new CognitoIdentityServiceProvider();

interface CreateUserBody {
  userEmail: string;
  group: 'Admins' | 'Devs';
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

  const body: CreateUserBody = event.body ? JSON.parse(event.body) : null;
  const { userEmail, group } = body;

  if (!body || !userEmail || !group) {
    return createError({
      message: 'Must provide request body with user email and group!',
      statusCode: 400,
    });
  }

  try {
    await cognito
      .adminCreateUser({
        UserPoolId: process.env.USER_POOL_ID,
        Username: userEmail,
        DesiredDeliveryMediums: ['EMAIL'],
        TemporaryPassword: 'Temp123$',
      })
      .promise();

    await cognito
      .adminAddUserToGroup({
        UserPoolId: process.env.USER_POOL_ID,
        Username: userEmail,
        GroupName: group,
      })
      .promise();
  } catch (err) {
    return createError(err);
  }

  return new LambdaResponse(201, {
    message: 'User created!',
  });
};
