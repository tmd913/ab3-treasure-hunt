import {
  APIGatewayProxyEventBase,
  APIGatewayProxyEventPathParameters,
  APIGatewayProxyResultV2,
  Context,
} from 'aws-lambda';
import { DynamoDB } from 'aws-sdk';
import { HuntAttribute, HuntType } from '../shared/enums';
import { getPlayerHunt } from '../helpers';
import { CustomAuthorizerContext, Location } from '../shared/interfaces';
import { createError, isInvalidLocation } from '../utils';
import { LambdaResponse } from '../shared/classes/LambdaResponse';

const docClient = new DynamoDB.DocumentClient();

interface UpdateHuntBody {
  type: string;
  location: Location;
}

interface GameResponse {
  isWinner: boolean;
  treasureImage: string;
  treasureDescription: string;
  treasureBearing: number;
  treasureDistance: number;
}

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

  const body: UpdateHuntBody = event.body ? JSON.parse(event.body) : null;
  const { type: typeStr, location } = body;
  // convert string to HuntType
  const type: HuntType = typeStr?.toUpperCase() as HuntType;

  if (!body) {
    return createError({
      message: 'Must provide request body!',
      statusCode: 400,
    });
  }

  // type property exists, ignore any other properties
  if (type) {
    try {
      await updateType(playerID, huntID, type);

      return new LambdaResponse(200, {
        message: 'Player hunt type updated',
      });
    } catch (err) {
      return createError(err);
    }
  }

  // location property exists, but type property does not
  if (location) {
    if (isInvalidLocation(location)) {
      return createError({
        message: 'Must provide valid latitude and longitude values!',
        statusCode: 400,
      });
    }

    try {
      await addLocation(playerID, huntID, location);

      const gameResponse = await createResponse(playerID, huntID, location);

      if (gameResponse.isWinner) {
        await updateType(playerID, huntID, HuntType.COMPLETED);
      }

      return new LambdaResponse(200, gameResponse);
    } catch (err) {
      return createError(err);
    }
  }

  return new LambdaResponse(400, {
    message: 'Must provide hunt type or location in request body!',
  });
};

/**
 * Update hunt type according to provided value
 * @param playerID Player ID associated hunt
 * @param huntID Hunt ID being updated
 * @param newType Hunt type after update
 */
const updateType = async (
  playerID: string,
  huntID: string,
  type: HuntType
): Promise<void> => {
  switch (type) {
    case HuntType.ACCEPTED:
      // valid if current type is CREATED
      await updateTypeDB(playerID, huntID, type, HuntType.CREATED);
      break;
    case HuntType.DENIED:
      // valid if current type is CREATED
      await updateTypeDB(playerID, huntID, type, HuntType.CREATED);
      break;
    case HuntType.STARTED:
      // valid if current type is ACCEPTED
      await updateTypeDB(playerID, huntID, type, HuntType.ACCEPTED);
      break;
    case HuntType.STOPPED:
      // valid if current type is STARTED
      await updateTypeDB(playerID, huntID, type, HuntType.STARTED);
      break;
    case HuntType.COMPLETED:
      // valid if current type is STARTED
      await updateTypeDB(playerID, huntID, type, HuntType.STARTED);
      break;
    default:
      throw new Error('Invalid hunt type!');
  }
};

/**
 * Database call to update the hunt type, provided the current hunt type is the expected value
 * @param playerID Player ID associated hunt
 * @param huntID Hunt ID being updated
 * @param newType Hunt type after update
 * @param currType Hunt type before update
 */
const updateTypeDB = async (
  playerID: string,
  huntID: string,
  newType: HuntType,
  currType: HuntType
): Promise<void> => {
  const timestamp = new Date().toISOString();

  await docClient
    .update({
      TableName: process.env.PLAYER_HUNTS_TABLE!,
      Key: {
        PlayerID: playerID,
        HuntID: huntID,
      },
      UpdateExpression:
        'SET #huntType = :newType, #huntTypeTime = :newTypeTime, #at = :timestamp',
      ConditionExpression: '#huntType = :currType',
      ExpressionAttributeNames: {
        '#huntType': 'HuntType',
        '#huntTypeTime': 'HuntTypeTime',
        '#at':
          newType[0].toUpperCase() + newType.toLowerCase().substring(1) + 'At',
      },
      ExpressionAttributeValues: {
        ':newType': newType,
        ':newTypeTime': newType + '#' + timestamp,
        ':currType': currType,
        ':timestamp': timestamp,
      },
    })
    .promise();
};

/**
 * Database call to update the hunt with a new player location
 * @param playerID Player ID associated hunt
 * @param huntID Hunt ID being updated
 * @param location New player location to be added
 */
const addLocation = async (
  playerID: string,
  huntID: string,
  location: Location
): Promise<void> => {
  // TODO: think about limiting number of locations
  await docClient
    .update({
      TableName: process.env.PLAYER_HUNTS_TABLE!,
      Key: {
        PlayerID: playerID,
        HuntID: huntID,
      },
      UpdateExpression: 'SET #locs = list_append(#locs, :newLoc)',
      ExpressionAttributeNames: {
        '#locs': 'PlayerLocations',
      },
      ExpressionAttributeValues: {
        ':newLoc': [location],
      },
    })
    .promise();
};

/**
 * Determines if the player has won by checking if the distance between
 * their current location and the treasure location is less than the
 * trigger distance. Returns that value along with distance and bearing metrics
 * @param playerID Player ID
 * @param huntID Hunt ID
 * @param location Player Location
 * @returns Response with game metrics
 */
const createResponse = async (
  playerID: string,
  huntID: string,
  location: Location
): Promise<GameResponse> => {
  // get treasure location and trigger distance
  const { Item: hunt } = await getPlayerHunt(playerID, huntID, [
    HuntAttribute.TREASURE_LOCATION,
    HuntAttribute.TREASURE_IMAGE,
    HuntAttribute.TREASURE_DESCRIPTION,
    HuntAttribute.TRIGGER_DISTANCE,
  ]);

  if (!hunt) {
    throw new Error('No hunt found!');
  }

  const treasureLocation = hunt[HuntAttribute.TREASURE_LOCATION];
  const treasureImage = hunt[HuntAttribute.TREASURE_IMAGE];
  const treasureDescription = hunt[HuntAttribute.TREASURE_DESCRIPTION];
  const triggerDistance = hunt[HuntAttribute.TRIGGER_DISTANCE];

  if (treasureLocation == null || triggerDistance == null) {
    throw new Error(
      'Treasure location and trigger distance are required attributes!'
    );
  }

  const treasureDistance = calculateDistance(location, treasureLocation);
  const treasureBearing = calculateBearing(location, treasureLocation);

  return {
    isWinner: treasureDistance < triggerDistance,
    treasureImage,
    treasureDescription,
    treasureBearing,
    treasureDistance,
  };
};

/**
 * Calculate distance in meters between locations
 * @param playerLocation Player location in degrees
 * @param treasureLocation Treasure location in degrees
 * @returns Distance beetween locations in meters
 */
export const calculateDistance = (
  playerLocation: Location,
  treasureLocation: Location
): number => {
  const earthRadiusM = 6371e3;
  const playerLatRad = degToRad(playerLocation.latitude);
  const playerLongRad = degToRad(playerLocation.longitude);
  const treasureLatRad = degToRad(treasureLocation.latitude);
  const treasureLongRad = degToRad(treasureLocation.longitude);
  const deltaLatRad = treasureLatRad - playerLatRad;
  const deltaLongRad = treasureLongRad - playerLongRad;

  const a =
    Math.sin(deltaLatRad / 2) ** 2 +
    Math.cos(playerLatRad) *
      Math.cos(treasureLatRad) *
      Math.sin(deltaLongRad / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const d = earthRadiusM * c;

  return Math.round(d);
};

/**
 * Converts value from degrees to radians
 * @param deg Value in degrees
 * @returns Value in radians
 */
const degToRad = (deg: number) => (deg * Math.PI) / 180;

/**
 * Calculate final bearing (direction) after traveling between points
 * @param startLocation Start location in degrees
 * @param endLocation End location in degrees
 * @returns Final bearing
 */
export const calculateBearing = (
  startLocation: Location,
  endLocation: Location
): number => {
  const startLat = degToRad(endLocation.latitude);
  const startLong = degToRad(endLocation.longitude);
  const endLat = degToRad(startLocation.latitude);
  const endLong = degToRad(startLocation.longitude);
  const y = Math.sin(endLong - startLong) * Math.cos(endLat);
  const x =
    Math.cos(startLat) * Math.sin(endLat) -
    Math.sin(startLat) * Math.cos(endLat) * Math.cos(endLong - startLong);
  const initialBearingRad = Math.atan2(y, x);
  const initialBearing = ((initialBearingRad * 180) / Math.PI + 360) % 360; // in degrees
  const finalBearing = (initialBearing + 180) % 360;

  return Math.round(finalBearing);
};
