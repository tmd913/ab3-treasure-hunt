import React from 'react';
import { Route } from 'react-router';
import { AuthContext, useAuth } from '../auth/use-auth';
import NotAuthorized from '../pages/NotAuthorized';

const PrivateRoute = ({
  children,
  allowedGroups,
  ...rest
}: React.PropsWithChildren<any>) => {
  const auth = useAuth();

  const hasRequiredGroup = (
    allowedGroups: string[],
    userGroups?: string[]
  ): boolean => {
    if (!allowedGroups || !userGroups || userGroups.length === 0) {
      return false;
    }

    return allowedGroups.some((group) => userGroups.includes(group));
  };

  const hasAllAuthProps = (auth: AuthContext): boolean => {
    return auth.user && auth.userGroups && auth.jwtToken && auth.credentials;
  };

  return (
    <Route {...rest}>
      {hasAllAuthProps(auth) &&
      hasRequiredGroup(allowedGroups, auth.userGroups) ? (
        children
      ) : (
        <NotAuthorized></NotAuthorized>
      )}
    </Route>
  );
};

export default PrivateRoute;
