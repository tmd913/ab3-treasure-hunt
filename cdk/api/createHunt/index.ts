import {
  APIGatewayProxyEventBase,
  APIGatewayProxyResultV2,
  Context,
} from 'aws-lambda';
import { DynamoDB } from 'aws-sdk';
import { createError } from '../utils';
import { v4 as uuidv4 } from 'uuid';
import { HuntType } from '../enums';

const docClient = new DynamoDB.DocumentClient();

interface TreasureLocation {
  latitude: number;
  longitude: number;
}
interface CreateHuntBody {
  playerID: string;
  playerEmail: string;
  treasureImage: string;
  treasureDescription: string;
  treasureLocation: TreasureLocation;
  triggerDistance: number;
}

export const handler = async (
  event: APIGatewayProxyEventBase<{ uuid: string; email: string }>,
  _context: Context
): Promise<APIGatewayProxyResultV2> => {
  if (!process.env.PLAYER_HUNTS_TABLE) {
    createError({
      message: 'Player Hunts Table name not provided!',
      statusCode: 500,
    });
  }

  const adminEmail = event.requestContext.authorizer.email;
  const body: CreateHuntBody = JSON.parse(event.body!);

  // all body properties must exist
  if (
    !body.playerID ||
    !body.playerEmail ||
    !body.treasureImage ||
    !body.treasureDescription ||
    !body.treasureLocation.latitude ||
    !body.treasureLocation.longitude ||
    !body.triggerDistance
  ) {
    return createError({
      message: 'Must provide all required properties in body!',
      statusCode: 400,
    });
  }

  if (!isValidLocation(body.treasureLocation)) {
    return createError({
      message: 'Must provide valid latitude and longitude values!',
      statusCode: 400,
    });
  }

  try {
    await createHunt(adminEmail, body);
  } catch (err) {
    return createError(err);
  }

  return {
    body: JSON.stringify({ message: 'Treasure Hunt Created' }),
    statusCode: 201,
  };
};

/**
 * Checks if the latitude and longitude for the location are valid
 * @param location Latitude and longitude of location
 * @returns Boolean stating validity
 */
const isValidLocation = (location: TreasureLocation): boolean => {
  return (
    Math.abs(location.latitude) <= 90 && Math.abs(location.longitude) <= 180
  );
};

const createHunt = (adminEmail: string, body: CreateHuntBody) => {
  const now = new Date();
  const year = now.getUTCFullYear();
  const timestamp = now.toISOString();

  const {
    playerID,
    playerEmail,
    treasureImage,
    treasureDescription,
    treasureLocation,
    triggerDistance,
  } = body;

  return docClient
    .put({
      TableName: process.env.PLAYER_HUNTS_TABLE!,
      Item: {
        PlayerID: playerID,
        HuntID: uuidv4(),
        PlayerEmail: playerEmail,
        PlayerLocations: [],
        TreasureImage: treasureImage,
        TreasureDescription: treasureDescription,
        TreasureLocation: {
          Latitude: treasureLocation.latitude,
          Longitude: treasureLocation.longitude,
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
};
