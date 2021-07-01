import {
  APIGatewayProxyEventBase,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda';

export const handler = async (
  event: APIGatewayProxyEventBase<{ uuid: string }>,
  _context: Context
): Promise<APIGatewayProxyResult> => {
  const uuid = event.requestContext.authorizer.uuid;
  const type = event.queryStringParameters?.type;

  return {
    body: JSON.stringify({
      uuid,
      items: ['item 1', 'item 2', 'item 3'].map((item) =>
        type ? type + ' - ' + item : item
      ),
      event,
    }),
    statusCode: 200,
  };
};
