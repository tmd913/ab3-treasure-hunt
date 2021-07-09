import {
  APIGatewayProxyEventBase,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda';
import { DynamoDB } from 'aws-sdk';
import { HuntType } from '../enums';
import { createError } from '../utils';

const docClient = new DynamoDB.DocumentClient();

export const handler = async (
  event: APIGatewayProxyEventBase<{ uuid: string; email: string }>,
  _context: Context
): Promise<APIGatewayProxyResult> => {
  if (!process.env.PLAYER_HUNTS_TABLE) {
    createError({
      message: 'Player Hunts Table name not provided!',
      statusCode: 500,
    });
  }

  const playerID = event?.pathParameters?.player;
  const typeStr = event.queryStringParameters?.type;
  // convert string to HuntType
  const type: HuntType = typeStr?.toUpperCase() as HuntType;

  if (!playerID || !type) {
    return createError({
      message: 'Must provide player ID and hunt type!',
      statusCode: 400,
    });
  }

  // default to DESC sort order unless ASC is specified
  const isSortOrderAsc =
    event.queryStringParameters?.sortOrder?.toLowerCase() === 'asc'
      ? true
      : false;

  let hunts: DynamoDB.DocumentClient.QueryOutput;
  try {
    // call appropriate method depending on if hunt type is provided
    hunts = await getPlayerHuntsByType(playerID, type, isSortOrderAsc);
  } catch (err) {
    return createError(err);
  }

  return {
    body: JSON.stringify({
      items: hunts.Items,
    }),
    statusCode: 200,
  };
};

/**
 * Get all player hunts by type, with paging
 * @param type Hunt type
 * @param isSortOrderAsc Is ascending sort order
 * @returns Query with page of player hunts for given type
 */
const getPlayerHuntsByType = (
  playerID: string,
  type: HuntType,
  isSortOrderAsc: boolean,
  page = 0,
  size = 20
) => {
  return docClient
    .query({
      TableName: process.env.PLAYER_HUNTS_TABLE!,
      IndexName: 'PlayerHuntTypeIndex',
      KeyConditionExpression:
        'PlayerID = :player AND begins_with(HuntTypeTime, :type)',
      ExpressionAttributeValues: {
        ':player': playerID,
        ':type': type,
      },
      ScanIndexForward: isSortOrderAsc,
    })
    .promise();
};
