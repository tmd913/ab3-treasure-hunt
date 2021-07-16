import {
  APIGatewayProxyEventBase,
  APIGatewayProxyEventPathParameters,
  APIGatewayProxyResultV2,
  Context,
} from 'aws-lambda';
import { DynamoDB } from 'aws-sdk';
import { HuntAttribute } from '../shared/enums';
import { getPlayerHunt } from '../helpers';
import { LambdaResponse } from '../shared/classes/LambdaResponse';
import { CustomAuthorizerContext } from '../shared/interfaces';
import { createError } from '../utils';

export const handler = async (
  event: APIGatewayProxyEventBase<CustomAuthorizerContext>,
  _context: Context
): Promise<APIGatewayProxyResultV2> => {
  if (!process.env.PLAYER_HUNTS_TABLE) {
    return createError({
      message: 'Player Hunts Table name not provided!',
      statusCode: 500,
    });
  }

  const { player: playerID, hunt: huntID }: APIGatewayProxyEventPathParameters =
    event.pathParameters || {};

  if (!playerID || !huntID) {
    return createError({
      message: 'Must provide player and hunt IDs!',
      statusCode: 400,
    });
  }

  let hunt: DynamoDB.DocumentClient.GetItemOutput;
  try {
    // call appropriate method depending on if hunt type is provided
    hunt = await getPlayerHunt(playerID, huntID, [
      HuntAttribute.PLAYER_LOCATIONS,
    ]);
  } catch (err) {
    return createError(err);
  }

  return new LambdaResponse(200, {
    item: hunt.Item,
  });
};
