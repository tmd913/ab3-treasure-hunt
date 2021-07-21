import {
  Context,
  APIGatewayProxyEventBase,
  APIGatewayProxyEventPathParameters,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { Location } from 'aws-sdk';
import { LambdaResponse } from '../shared/classes/LambdaResponse';
import { createError } from '../utils';

const location = new Location();

export const handler = async (
  event: APIGatewayProxyEventBase<{ uuid: string; email: string }>,
  _context: Context
): Promise<APIGatewayProxyResultV2> => {
  if (!process.env.PLACE_INDEX_NAME) {
    return createError({
      message: 'Place Index name not provided!',
      statusCode: 500,
    });
  }

  const { zipCode }: APIGatewayProxyEventPathParameters =
    event.pathParameters || {};

  if (!zipCode) {
    return createError({
      message: 'Must provide zip code!',
      statusCode: 400,
    });
  }

  let results: Location.SearchPlaceIndexForTextResponse;
  try {
    results = await location
      .searchPlaceIndexForText({
        IndexName: process.env.PLACE_INDEX_NAME,
        Text: zipCode,
        FilterCountries: ['USA'],
      })
      .promise();
  } catch (err) {
    return createError(err);
  }

  const [longitude, latitude] = results.Results[0].Place.Geometry.Point || [];

  return new LambdaResponse(200, {
    longitude,
    latitude,
  });
};
