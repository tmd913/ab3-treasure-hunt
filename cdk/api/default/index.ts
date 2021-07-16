import {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
  Context,
} from 'aws-lambda';
import { LambdaResponse } from '../shared/classes/LambdaResponse';

export const handler = async (
  _event: APIGatewayProxyEventV2,
  _context: Context
): Promise<APIGatewayProxyResultV2> => {
  return new LambdaResponse(404, { statusCode: 404, msg: 'Not found :(' });
};
