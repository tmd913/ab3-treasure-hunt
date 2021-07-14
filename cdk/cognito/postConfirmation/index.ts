import { PostAuthenticationTriggerEvent, Context } from 'aws-lambda';
import { CognitoIdentityServiceProvider } from 'aws-sdk';

const cognito = new CognitoIdentityServiceProvider();

export const handler = async (
  event: PostAuthenticationTriggerEvent,
  _context: Context
): Promise<PostAuthenticationTriggerEvent> => {
  console.log(event);

  const groups = event.request.userAttributes['cognito:groups'];

  if (!groups || groups.length === 0) {
    await cognito
      .adminAddUserToGroup({
        GroupName: 'Players',
        UserPoolId: event.userPoolId,
        Username: event.userName,
      })
      .promise();
  }

  return event;
};
