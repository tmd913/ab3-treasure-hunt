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

  return <>{!auth.user && <div>Home</div>}</>;
}
