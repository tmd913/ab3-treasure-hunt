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

  const typeStr = event.queryStringParameters?.type;
  // convert string to HuntType
  const type: HuntType = typeStr?.toUpperCase() as HuntType;
  // default to current year if none is provided or if invalid
  const year =
    event.queryStringParameters?.year?.length === 4
      ? +event.queryStringParameters?.year
      : new Date().getUTCFullYear();
  // default to DESC sort order unless ASC is specified
  const isSortOrderAsc =
    event.queryStringParameters?.sortOrder?.toLowerCase() === 'asc'
      ? true
      : false;

  let hunts: DynamoDB.DocumentClient.QueryOutput;
  try {
    // call appropriate method depending on if hunt type is provided
    hunts = await (type
      ? getHuntsByType(type, isSortOrderAsc, year)
      : getHuntsAllTypes(isSortOrderAsc, year));
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
 * Get all hunts in a given year, sorted by creation time
 * @param isSortOrderAsc Is ascending sort order
 * @param year Created year
 * @returns Query with all hunts for given year
 */
const getHuntsAllTypes = (isSortOrderAsc: boolean, year: number) => {
  return docClient
    .query({
      TableName: process.env.PLAYER_HUNTS_TABLE!,
      IndexName: 'CreatedAtIndex',
      KeyConditionExpression: 'CreatedYear = :year',
      ExpressionAttributeValues: {
        ':year': year,
      },
      ScanIndexForward: isSortOrderAsc,
    })
    .promise();
};

/**
 * Get all hunts of a given type in a given year, sorted by last modified time
 * @param type Hunt type
 * @param isSortOrderAsc Is ascending sort order
 * @param year Created year
 * @returns Query with all hunts for given type and year
 */
const getHuntsByType = (
  type: HuntType,
  isSortOrderAsc: boolean,
  year: number
) => {
  return docClient
    .query({
      TableName: process.env.PLAYER_HUNTS_TABLE!,
      IndexName: 'HuntTypeIndex',
      KeyConditionExpression:
        'HuntType = :type AND begins_with(HuntTypeTime, :typeTime)',
      ExpressionAttributeValues: {
        ':type': type,
        ':typeTime': type + '#' + year,
      },
      ScanIndexForward: isSortOrderAsc,
    })
    .promise();
};
