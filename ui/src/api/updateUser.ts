import { API } from 'aws-amplify';

export const updateUser = (
  apiName: string,
  path: string,
  init: any
): Promise<any> => {
  return API.put(apiName, path, init);
};
