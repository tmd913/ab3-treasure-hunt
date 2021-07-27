// Hook (use-auth.js)
import React, { useState, useEffect, useContext, createContext } from 'react';
import { Auth, Hub } from 'aws-amplify';
import { ICredentials } from '@aws-amplify/core';
import { CognitoUser } from '@aws-amplify/auth';

export interface AuthContext {
  user?: CognitoUser | any;
  userGroups?: string[];
  jwtToken?: string;
  credentials?: ICredentials;
  signIn: () => void;
  signOut: () => void;
}

const authContext = createContext<AuthContext>({
  user: undefined,
  userGroups: undefined,
  jwtToken: undefined,
  credentials: undefined,
  signIn: () => {},
  signOut: () => {},
});

// Provider component that wraps your app and makes auth object ...
// ... available to any child component that calls useAuth().
export const ProvideAuth = ({ children }: React.PropsWithChildren<any>) => {
  const auth = useProvideAuth();
  return <authContext.Provider value={auth}>{children}</authContext.Provider>;
};

// Hook for child components to get the auth object ...
// ... and re-render when it changes.
export const useAuth = () => {
  return useContext(authContext);
};

// Provider hook that creates auth object and handles state
const useProvideAuth = () => {
  const [user, setUser] = useState<CognitoUser | undefined>();
  const [userGroups, setUserGroups] = useState<string[] | undefined>([]);
  const [credentials, setCredentials] = useState<ICredentials | undefined>();
  const [jwtToken, setJwtToken] = useState<string | undefined>();

  useEffect(() => {
    const fetchCredentials = async () => {
      await handleSignIn().catch(() => {
        console.log('User not authenticated');
      });
    };

    fetchCredentials();
  }, []);

  useEffect(() => {
    Hub.listen('auth', async ({ payload: { event, data } }) => {
      switch (event) {
        case 'signIn':
          await handleSignIn();
          break;
        case 'signOut':
          await handleSignOut();
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
  const handleSignIn = async (): Promise<void> => {
    const user = await Auth.currentAuthenticatedUser();
    const idToken = (await Auth.currentSession()).getIdToken();
    const userGroups = idToken.payload['cognito:groups'];
    const jwtToken = idToken.getJwtToken();
    const credentials = await Auth.currentUserCredentials();
    setUser(user);
    setUserGroups(userGroups);
    setJwtToken(jwtToken);
    setCredentials(credentials);
  };

  const handleSignOut = async (): Promise<void> => {
    setUser(undefined);
    setUserGroups(undefined);
    setJwtToken(undefined);
    setCredentials(undefined);
  };

  // Return the user object and auth methods
  return {
    user,
    userGroups,
    jwtToken,
    credentials,
    signIn,
    signOut,
  };
};
