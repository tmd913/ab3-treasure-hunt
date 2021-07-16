import { Box, List, makeStyles } from '@material-ui/core';
import { createStyles } from '@material-ui/styles';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getPlayerHunts } from '../api';
import { ApiNames } from '../api/ApiNames.enum';
import { useAuth } from '../auth/use-auth';
import Hunt from '../components/Hunt';
import { toTitleCase } from '../utils';

const useStyles = makeStyles(() =>
  createStyles({
    root: {
      width: '100%',
      maxWidth: 500,
    },
    huntMarginBottom: {
      marginBottom: '1rem',
    },
  })
);

export default function PlayerHunts() {
  const auth = useAuth();

  const classes = useStyles();

  const [type, setType] = useState<string>();
  const [hunts, setHunts] = useState<any>();

  // A custom hook that builds on useLocation to parse
  // the query string for you.
  const useQuery = () => {
    return new URLSearchParams(useLocation().search);
  };
  const query = useQuery();

  useEffect(() => {
    const getHunts = async () => {
      const type = query.get('type');

      if (!type) {
        return;
      }

      setType(type);

      const hunts = await getPlayerHunts(
        ApiNames.TREASURE_HUNT,
        `/players/${auth.user.getUsername()}/hunts?type=${type}`,
        {
          headers: {
            Authorization: 'Bearer ' + auth.jwtToken,
            'Content-Type': 'application/json',
          },
        }
      );
      setHunts(hunts);
    };

    getHunts();
  }, []);

  return (
    <>
      {type && hunts?.items && hunts.items.length > 0 && (
        <>
          <h2>{toTitleCase(type)} Hunts</h2>
          <List className={classes.root}>
            {hunts?.items?.map((item: any, index: number) => {
              const isLastItem = index === hunts.items.length - 1;
              return (
                <Box
                  marginBottom={!isLastItem ? '1rem' : '0'}
                  key={item.HuntID}
                >
                  <Hunt hunt={item} type={toTitleCase(type)} />
                </Box>
              );
            })}
          </List>
        </>
      )}
    </>
  );
}
