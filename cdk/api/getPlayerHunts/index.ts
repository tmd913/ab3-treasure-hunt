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
  const {
    type: typeStr,
    sortOrder,
    limit: limitStr,
    lastEvaluatedHuntID,
    lastEvaluatedHuntTypeTime,
  } = event.queryStringParameters || {};

  // convert hunt type string to HuntType enum
  const type: HuntType = typeStr?.toUpperCase() as HuntType;

  if (!playerID || !type) {
    return createError({
      message: 'Must provide player ID and hunt type!',
      statusCode: 400,
    });
  }

  // default to DESC sort order unless ASC is specified
  const isSortOrderAsc = sortOrder?.toLowerCase() === 'asc' ? true : false;

  // convert limit string to number, with default value of 20
  const limit = limitStr ? +limitStr : 20;

  // reconstruct last evaluated key using query params
  const lastEvaluatedKeyInput =
    lastEvaluatedHuntID && lastEvaluatedHuntTypeTime
      ? {
          PlayerID: playerID,
          HuntID: lastEvaluatedHuntID,
          HuntTypeTime: lastEvaluatedHuntTypeTime,
        }
      : undefined;

  let hunts: DynamoDB.DocumentClient.QueryOutput;
  try {
    // call appropriate method depending on if hunt type is provided
    hunts = await getPlayerHuntsByType(
      playerID,
      type,
      isSortOrderAsc,
      limit,
      lastEvaluatedKeyInput
    );
  } catch (err) {
    return createError(err);
  }

  const lastEvaluatedKeyOutput = hunts.LastEvaluatedKey;

  let returnBody = {
    items: hunts.Items || [],
  };

  if (lastEvaluatedKeyOutput) {
    returnBody = {
      ...returnBody,
      ...{ lastEvaluatedKey: lastEvaluatedKeyOutput },
    };
  }

  return {
    body: JSON.stringify(returnBody),
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
  limit: number,
  lastEvaluatedKey?: DynamoDB.DocumentClient.Key
) => {
  // TODO: apply appropriate projections depending on type, add paging
  let params: DynamoDB.DocumentClient.QueryInput = {
    TableName: process.env.PLAYER_HUNTS_TABLE!,
    IndexName: 'PlayerHuntTypeIndex',
    KeyConditionExpression:
      'PlayerID = :player AND begins_with(HuntTypeTime, :type)',
    ExpressionAttributeValues: {
      ':player': playerID,
      ':type': type,
    },
    ScanIndexForward: isSortOrderAsc,
    Limit: limit,
  };

  if (lastEvaluatedKey) {
    params = { ...params, ExclusiveStartKey: lastEvaluatedKey };
  }

  return docClient.query(params).promise();
};
