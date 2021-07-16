import { DynamoDB } from 'aws-sdk';
import { HuntAttribute } from '../shared/enums';

const docClient = new DynamoDB.DocumentClient();

/**
 * Get player hunt DynamoDB call
 * @param playerID Player ID
 * @param huntID Hunt ID
 * @param projections Projected DynamoDB attributes
 * @returns Player hunt information
 */
export const getPlayerHunt = (
  playerID: string,
  huntID: string,
  projections?: HuntAttribute[]
) => {
  let params: DynamoDB.DocumentClient.GetItemInput = {
    TableName: process.env.PLAYER_HUNTS_TABLE!,
    Key: {
      PlayerID: playerID,
      HuntID: huntID,
    },
  };

  if (projections && projections.length > 0) {
    params = { ...params, ProjectionExpression: projections.toString() };
  }

  return docClient.get(params).promise();
};
