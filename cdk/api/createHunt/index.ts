import {
  APIGatewayProxyEventBase,
  APIGatewayProxyResultV2,
  Context,
} from 'aws-lambda';
import { DynamoDB } from 'aws-sdk';
import { createError, isInvalidLocation } from '../utils';
import { v4 as uuidv4 } from 'uuid';
import { HuntType } from '../shared/enums';
import { CreateHuntBody } from '../shared/interfaces';
import { LambdaResponse } from '../shared/classes/LambdaResponse';

const docClient = new DynamoDB.DocumentClient();

export const handler = async (
  event: APIGatewayProxyEventBase<{ uuid: string; email: string }>,
  _context: Context
): Promise<APIGatewayProxyResultV2> => {
  if (!process.env.PLAYER_HUNTS_TABLE) {
    return createError({
      message: 'Player Hunts Table name not provided!',
      statusCode: 500,
    });
  }

  const adminEmail = event.requestContext.authorizer.email;
  const body: CreateHuntBody = event.body ? JSON.parse(event.body) : {};

  if (isMissingBodyProperty(body)) {
    return createError({
      message: 'Must provide all required properties in body!',
      statusCode: 400,
    });
  }

  if (isInvalidLocation(body.treasureLocation)) {
    return createError({
      message: 'Must provide valid latitude and longitude values!',
      statusCode: 400,
    });
  }

  let huntID: string;
  try {
    huntID = await createHunt(adminEmail, body);
  } catch (err) {
    return createError(err);
  }

  return new LambdaResponse(201, { huntID });
};

/**
 * Checks if the body is missing a required property
 * @param body Request body for creating hunt
 * @returns Boolean stating if body is missing properties
 */
const isMissingBodyProperty = (body: CreateHuntBody): boolean => {
  return (
    !body.playerID ||
    !body.playerEmail ||
    !body.treasureImage ||
    !body.treasureDescription ||
    !body.treasureLocation ||
    !body.triggerDistance
  );
};

const createHunt = async (adminEmail: string, body: CreateHuntBody) => {
  const now = new Date();
  const year = now.getUTCFullYear();
  const timestamp = now.toISOString();

  const {
    playerID,
    playerEmail,
    treasureDescription,
    treasureLocation: { latitude, longitude },
    triggerDistance,
  } = body;

  const huntID = uuidv4();

  await docClient
    .put({
      TableName: process.env.PLAYER_HUNTS_TABLE!,
      Item: {
        PlayerID: playerID,
        HuntID: huntID,
        PlayerEmail: playerEmail,
        PlayerLocations: [],
        TreasureDescription: treasureDescription,
        TreasureLocation: {
          latitude,
          longitude,
        },
        TriggerDistance: triggerDistance,
        CreatedBy: adminEmail,
        CreatedAt: timestamp,
        CreatedYear: year,
        HuntType: HuntType.CREATED,
        HuntTypeTime: HuntType.CREATED + '#' + timestamp,
      },
    })
    .promise();

  return huntID;
};
