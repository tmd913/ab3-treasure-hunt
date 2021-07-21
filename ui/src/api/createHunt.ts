import { API } from 'aws-amplify';

export const createHunt = (
  apiName: string,
  path: string,
  init: any
): Promise<any> => {
  return API.post(apiName, path, init);
};
