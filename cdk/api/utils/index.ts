import { APIGatewayProxyResult } from 'aws-lambda';
import { AWSError } from 'aws-sdk';
import { Location } from '../interfaces';

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

/**
 * Checks if the latitude and longitude for the location are invalid
 * @param location Latitude and longitude of location
 * @returns Boolean stating invalidity
 */
export const isInvalidLocation = (location: Location): boolean => {
  const { latitude, longitude } = location;
  return (
    latitude == null ||
    longitude == null ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  );
};
