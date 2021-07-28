import { Box, Theme } from '@material-ui/core';
import { createStyles, makeStyles } from '@material-ui/styles';
import { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../auth/use-auth';

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    backgroundContainer: {
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      minHeight: '100%',
      flexGrow: 1,
    },
    background: {
      backgroundColor: 'rgb(131,58,180)',
      background:
        'linear-gradient(340deg, rgba(131,58,180,1) 0%, rgba(253,29,29,1) 50%, rgba(252,176,69,1) 100%)',
      width: '100%',
      height: '100%',
      flexGrow: 1,
    },
  })
);

export default function Home() {
  const auth = useAuth();
  const history = useHistory();
  const classes = useStyles();

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
    <div className={classes.backgroundContainer}>
      {!auth.user && <div className={classes.background}></div>}
    </div>
  );
}
