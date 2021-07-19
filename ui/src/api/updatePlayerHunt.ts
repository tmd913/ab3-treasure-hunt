import { API } from 'aws-amplify';

export const updatePlayerHunt = (
  apiName: string,
  path: string,
  init: any
): Promise<any> => {
  return API.put(apiName, path, init);
};
