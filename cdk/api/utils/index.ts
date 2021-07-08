import { APIGatewayProxyResult } from 'aws-lambda';
import { AWSError } from 'aws-sdk';

/**
 * Create API Gateway Error Object
 * @param err Error Object
 * @returns Object to be returned by API Gateway
 */
export const createError = (err: Partial<AWSError>): APIGatewayProxyResult => {
  return {
    body: JSON.stringify({
      message: err?.message || 'Internal Server Error',
    }),
    statusCode: err?.statusCode || 500,
  };
};
