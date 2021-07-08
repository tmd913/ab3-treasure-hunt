import {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
  Context,
} from 'aws-lambda';

export const handler = async (
  _event: APIGatewayProxyEventV2,
  _context: Context
): Promise<APIGatewayProxyResultV2> => {
  return {
    body: JSON.stringify({ statusCode: 200, msg: 'get map' }),
    statusCode: 200,
  };
};
