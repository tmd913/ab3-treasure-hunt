import { API } from 'aws-amplify';

export const getHunts = (
  apiName: string,
  path: string,
  init: any
): Promise<any> => {
  return API.get(apiName, path, init);
};
