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

interface LastEvaluatedKeyAttributes {
  lastEvaluatedPlayerID?: string;
  lastEvaluatedHuntID?: string;
  lastEvaluatedHuntType?: string;
  lastEvaluatedHuntTypeTime?: string;
  lastEvaluatedCreatedYear?: string;
  lastEvaluatedCreatedAt?: string;
}

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

  const projections = [
    HuntAttribute.PLAYER_ID,
    HuntAttribute.HUNT_ID,
    HuntAttribute.PLAYER_EMAIL,
    HuntAttribute.TREASURE_IMAGE,
    HuntAttribute.TREASURE_DESCRIPTION,
    HuntAttribute.TREASURE_LOCATION,
    HuntAttribute.TRIGGER_DISTANCE,
    HuntAttribute.CREATED_BY,
    HuntAttribute.CREATED_AT,
    HuntAttribute.CREATED_YEAR,
    HuntAttribute.HUNT_TYPE,
    HuntAttribute.HUNT_TYPE_TIME,
    HuntAttribute.ACCEPTED_AT,
    HuntAttribute.DENIED_AT,
    HuntAttribute.STARTED_AT,
    HuntAttribute.STOPPED_AT,
    HuntAttribute.COMPLETED_AT,
  ];

  const {
    year: yearStr,
    type: typeStr,
    sortOrder,
    limit: limitStr,
    lastEvaluatedPlayerID,
    lastEvaluatedHuntID,
    lastEvaluatedHuntType,
    lastEvaluatedHuntTypeTime,
    lastEvaluatedCreatedYear,
    lastEvaluatedCreatedAt,
  } = event.queryStringParameters || {};

  const year = yearStr?.length === 4 ? +yearStr : new Date().getUTCFullYear();

  // convert hunt type string to HuntType enum
  const type: HuntType = typeStr?.toUpperCase() as HuntType;

  // default to DESC sort order unless ASC is specified
  const isSortOrderAsc = sortOrder?.toLowerCase() === 'asc' ? true : false;

  // convert limit string to number, with default value of 20
  const limit = limitStr ? +limitStr : 20;

  const lastEvaluatedKeyInput = createLastEvaluatedKey({
    lastEvaluatedPlayerID,
    lastEvaluatedHuntID,
    lastEvaluatedHuntType,
    lastEvaluatedHuntTypeTime,
    lastEvaluatedCreatedYear,
    lastEvaluatedCreatedAt,
  });

  let hunts: DynamoDB.DocumentClient.QueryOutput;
  try {
    // call appropriate method depending on if hunt type is provided
    hunts = await (type
      ? getHuntsByType(
          type,
          isSortOrderAsc,
          year,
          projections,
          limit,
          lastEvaluatedKeyInput
        )
      : getHuntsAllTypes(
          isSortOrderAsc,
          year,
          projections,
          limit,
          lastEvaluatedKeyInput
        ));
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
 * Create the proper last evaluated key depending on the query type,
 * or undefined if last evaluated key not provided
 * @param lastEvaluatedKeyAttributes All possible last evaluated key attributes
 * @returns Last evaluated key
 */
const createLastEvaluatedKey = (
  lastEvaluatedKeyAttributes: LastEvaluatedKeyAttributes
): DynamoDB.DocumentClient.Key | undefined => {
  const {
    lastEvaluatedPlayerID,
    lastEvaluatedHuntID,
    lastEvaluatedHuntType,
    lastEvaluatedHuntTypeTime,
    lastEvaluatedCreatedYear,
    lastEvaluatedCreatedAt,
  } = lastEvaluatedKeyAttributes;

  // base table partition and sort keys required
  if (!lastEvaluatedPlayerID || !lastEvaluatedHuntID) {
    return undefined;
  }

  let lastEvaluatedKeyBase = {
    PlayerID: lastEvaluatedPlayerID,
    HuntID: lastEvaluatedHuntID,
  };

  // filtered by hunt type
  if (lastEvaluatedHuntType && lastEvaluatedHuntTypeTime) {
    return {
      ...lastEvaluatedKeyBase,
      ...{
        HuntType: lastEvaluatedHuntType,
        HuntTypeTime: lastEvaluatedHuntTypeTime,
      },
    };
  }

  // all hunt types
  if (lastEvaluatedCreatedYear && lastEvaluatedCreatedAt) {
    return {
      ...lastEvaluatedKeyBase,
      ...{
        CreatedYear: +lastEvaluatedCreatedYear,
        CreatedAt: lastEvaluatedCreatedAt,
      },
    };
  }

  return undefined;
};

/**
 * Get all hunts in a given year, sorted by creation time
 * @param isSortOrderAsc Is ascending sort order
 * @param year Created year
 * @param projections Projected DynamoDB attributes
 * @param limit Max items retreived
 * @param lastEvaluatedKey Last evaluated key
 * @returns Query with all hunts for given year
 */
const getHuntsAllTypes = (
  isSortOrderAsc: boolean,
  year: number,
  projections: HuntAttribute[],
  limit: number,
  lastEvaluatedKey?: DynamoDB.DocumentClient.Key
) => {
  let params: DynamoDB.DocumentClient.QueryInput = {
    TableName: process.env.PLAYER_HUNTS_TABLE!,
    IndexName: 'CreatedAtIndex',
    KeyConditionExpression: 'CreatedYear = :year',
    ExpressionAttributeValues: {
      ':year': year,
    },
    ProjectionExpression: projections.toString(),
    ScanIndexForward: isSortOrderAsc,
    Limit: limit,
  };

  if (lastEvaluatedKey) {
    params = { ...params, ExclusiveStartKey: lastEvaluatedKey };
  }

  return docClient.query(params).promise();
};

/**
 * Get all hunts of a given type in a given year, sorted by last modified time
 * @param type Hunt type
 * @param isSortOrderAsc Is ascending sort order
 * @param year Created year
 * @param projections Projected DynamoDB attributes
 * @param limit Max items retreived
 * @param lastEvaluatedKey Last evaluated key
 * @returns Query with all hunts for given type and year
 */
const getHuntsByType = (
  type: HuntType,
  isSortOrderAsc: boolean,
  year: number,
  projections: HuntAttribute[],
  limit: number,
  lastEvaluatedKey?: DynamoDB.DocumentClient.Key
) => {
  let params: DynamoDB.DocumentClient.QueryInput = {
    TableName: process.env.PLAYER_HUNTS_TABLE!,
    IndexName: 'HuntTypeIndex',
    KeyConditionExpression:
      'HuntType = :type AND begins_with(HuntTypeTime, :typeTime)',
    ExpressionAttributeValues: {
      ':type': type,
      ':typeTime': type + '#' + year,
    },
    ProjectionExpression: projections.toString(),
    ScanIndexForward: isSortOrderAsc,
    Limit: limit,
  };

  if (lastEvaluatedKey) {
    params = { ...params, ExclusiveStartKey: lastEvaluatedKey };
  }

  return docClient.query(params).promise();
};
