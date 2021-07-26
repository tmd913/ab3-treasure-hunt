import { API } from 'aws-amplify';

export const createUser = (
  apiName: string,
  path: string,
  init: any
): Promise<any> => {
  return API.post(apiName, path, init);
};
