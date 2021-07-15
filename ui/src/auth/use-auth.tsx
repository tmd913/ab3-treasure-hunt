// Hook (use-auth.js)
import React, { useState, useEffect, useContext, createContext } from 'react';
import { Auth, Hub } from 'aws-amplify';
import { ICredentials } from '@aws-amplify/core';
import { CognitoUser } from '@aws-amplify/auth';

const authContext = createContext<{
  user?: CognitoUser | any;
  userGroups?: string[];
  credentials?: ICredentials;
  signIn: () => void;
  signOut: () => void;
}>({
  user: undefined,
  userGroups: undefined,
  credentials: undefined,
  signIn: () => {},
  signOut: () => {},
});

// Provider component that wraps your app and makes auth object ...
// ... available to any child component that calls useAuth().
export function ProvideAuth({ children }: React.PropsWithChildren<any>) {
  const auth = useProvideAuth();
  return <authContext.Provider value={auth}>{children}</authContext.Provider>;
}

// Hook for child components to get the auth object ...
// ... and re-render when it changes.
export const useAuth = () => {
  return useContext(authContext);
};

// Provider hook that creates auth object and handles state
function useProvideAuth() {
  const [user, setUser] = useState<CognitoUser | undefined>();
  const [userGroups, setUserGroups] = useState<string[] | undefined>([]);
  const [credentials, setCredentials] = useState<ICredentials | undefined>();

  useEffect(() => {
    const fetchCredentials = async () => {
      await handleAuthStateChange().catch(() => {
        console.log('User not authenticated');
      });
    };

    fetchCredentials();
  }, []);

  useEffect(() => {
    Hub.listen('auth', async ({ payload: { event, data } }) => {
      console.log(event);
      switch (event) {
        case 'signIn':
        case 'signOut':
          await handleAuthStateChange();
          break;
        case 'signIn_failure':
          console.error(data);
          break;
        default:
          break;
      }
    });
  }, []);

  const signIn = () => {
    Auth.federatedSignIn();
  };

  const signOut = () => {
    Auth.signOut();
  };

  /**
   * Get necessary values from amplify Auth
   */
  const handleAuthStateChange = async (): Promise<void> => {
    const user = await Auth.currentAuthenticatedUser();
    const userGroups = (await Auth.currentSession()).getIdToken().payload[
      'cognito:groups'
    ];
    const credentials = await Auth.currentUserCredentials();
    setUser(user);
    setUserGroups(userGroups);
    setCredentials(credentials);
  };

  // Return the user object and auth methods
  return {
    user,
    userGroups,
    credentials,
    signIn,
    signOut,
  };
}
