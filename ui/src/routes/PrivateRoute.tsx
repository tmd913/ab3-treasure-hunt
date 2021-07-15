import React from 'react';
import { Redirect, Route } from 'react-router';
import { useAuth } from '../auth/use-auth';
import { NotAuthorized } from '../pages/NotAuthorized';

export const PrivateRoute = ({
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

  return (
    <Route {...rest}>
      {auth.user && hasRequiredGroup(allowedGroups, auth.userGroups) ? (
        children
      ) : (
        <NotAuthorized></NotAuthorized>
      )}
    </Route>
  );
};
