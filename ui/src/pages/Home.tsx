import { Box } from '@material-ui/core';
import { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../auth/use-auth';

export default function Home() {
  const auth = useAuth();
  const history = useHistory();

  useEffect(() => {
    if (
      !auth ||
      !auth.user ||
      !auth.userGroups ||
      auth.userGroups.length === 0
    ) {
      return;
    }

    history.push(
      auth.userGroups.includes('Players') ? '/hunts?type=started' : '/logs'
    );
  }, [auth]);

  return (
    <>
      {!auth.user && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
          }}
        >
          <div
            style={{
              backgroundColor: 'rgb(131,58,180)',
              background:
                'linear-gradient(342deg, rgba(131,58,180,1) 0%, rgba(253,29,29,1) 50%, rgba(252,176,69,1) 100%)',
              width: '100%',
              height: '100%',
            }}
          ></div>
        </div>
      )}
    </>
  );
}
