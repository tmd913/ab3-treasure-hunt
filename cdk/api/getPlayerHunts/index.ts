import {
  APIGatewayProxyEventBase,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda';
import { DynamoDB } from 'aws-sdk';
import { HuntAttribute, HuntType } from '../shared/enums';
import { LambdaResponse } from '../shared/classes/LambdaResponse';
import { createError } from '../utils';

const docClient = new DynamoDB.DocumentClient();

const PlayerHuntTypeProjections = {
  CREATED: [
    HuntAttribute.PLAYER_ID,
    HuntAttribute.HUNT_ID,
    HuntAttribute.CREATED_AT,
    HuntAttribute.CREATED_BY,
  ].toString(),
  ACCEPTED: [
    HuntAttribute.PLAYER_ID,
    HuntAttribute.HUNT_ID,
    HuntAttribute.ACCEPTED_AT,
  ].toString(),
  DENIED: [
    HuntAttribute.PLAYER_ID,
    HuntAttribute.HUNT_ID,
    HuntAttribute.DENIED_AT,
  ].toString(),
  STARTED: [
    HuntAttribute.PLAYER_ID,
    HuntAttribute.HUNT_ID,
    HuntAttribute.STARTED_AT,
  ].toString(),
  STOPPED: [
    HuntAttribute.PLAYER_ID,
    HuntAttribute.HUNT_ID,
    HuntAttribute.STOPPED_AT,
  ].toString(),
  COMPLETED: [
    HuntAttribute.PLAYER_ID,
    HuntAttribute.HUNT_ID,
    HuntAttribute.COMPLETED_AT,
    HuntAttribute.TREASURE_IMAGE,
    HuntAttribute.TREASURE_DESCRIPTION,
    HuntAttribute.TREASURE_LOCATION,
  ].toString(),
};

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

  return new LambdaResponse(200, returnBody);
};

/**
 * Get all player hunts by type, with paging
 * @param type Hunt type
 * @param isSortOrderAsc Is ascending sort order
 * @param limit Max items retreived
 * @param lastEvaluatedKey Last evaluated key
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
    ProjectionExpression: PlayerHuntTypeProjections[type],
    ScanIndexForward: isSortOrderAsc,
    Limit: limit,
  };

  if (lastEvaluatedKey) {
    params = { ...params, ExclusiveStartKey: lastEvaluatedKey };
  }

  return docClient.query(params).promise();
};
