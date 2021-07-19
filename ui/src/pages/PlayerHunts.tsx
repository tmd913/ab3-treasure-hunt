import { Box, List, makeStyles } from '@material-ui/core';
import { createStyles } from '@material-ui/styles';
import { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { getPlayerHunts } from '../api';
import { ApiNames } from '../api/ApiNames.enum';
import { useAuth } from '../auth/use-auth';
import Hunt from '../components/Hunt';
import { useQuery } from '../utils';
import LinkButton from '../components/LinkButton';
import FunctionButton from '../components/FunctionButton';
import HuntInfoLink from '../shared/classes/HuntInfoLink';
import HuntInfoFunction from '../shared/classes/HuntInfoFunction';
import HuntInfo, { ButtonType } from '../shared/classes/HuntInfo';
import { HuntType } from '../shared/enums/HuntType';
import HuntTypeTabs from '../components/HuntTypeTabs';
import { updatePlayerHunt } from '../api/updatePlayerHunt';

const useStyles = makeStyles(() =>
  createStyles({
    mainContentContainer: {
      width: '100%',
      display: 'flex',
      justifyContent: 'center',
    },
    mainContent: {
      width: '100%',
      maxWidth: '600px',
    },
    title: {
      paddingLeft: '1.5rem',
    },
    huntMarginBottom: {
      marginBottom: '1rem',
    },
    navigation: {
      position: 'fixed',
      bottom: 0,
      width: '100%',
    },
  })
);

export default function PlayerHunts() {
  const auth = useAuth();
  const classes = useStyles();
  const query = useQuery();

  const [type, setType] = useState<HuntType>();
  const [hunts, setHunts] = useState<any>();
  const [huntInfo, setHuntInfo] = useState<HuntInfo>();
  const [tabValue, setTabValue] = useState<number>(0);

  useEffect(() => {
    const type = query.get('type')?.toUpperCase() as HuntType;

    if (!type) {
      return;
    }

    setType(HuntType[type]);
  }, [query]);

  useEffect(() => {
    getAndSetHunts();
  }, [type, auth]);

  useEffect(() => {
    setHunts([]);

    switch (type) {
      case HuntType.STARTED:
        setTabValue(0);
        setHuntInfo(
          new HuntInfoLink(
            'Started Hunts',
            'Started at',
            'StartedAt',
            'Resume',
            '/games/:game'
          )
        );
        break;
      case HuntType.ACCEPTED:
        setTabValue(1);
        setHuntInfo(
          new HuntInfoLink(
            'Accepted Hunts',
            'Accepted at',
            'AcceptedAt',
            'Start',
            '/games/:game',
            (huntID: string) => {
              updateHunt(huntID, HuntType.STARTED);
            }
          )
        );
        break;
      case HuntType.CREATED:
        setTabValue(2);
        setHuntInfo(
          new HuntInfoFunction(
            'Hunt Invites',
            'Invited at',
            'CreatedAt',
            'Accept',
            async (huntID: string) => {
              await updateHunt(huntID, HuntType.ACCEPTED);
              getAndSetHunts();
            }
          )
        );
        break;
      case HuntType.COMPLETED:
        setTabValue(3);
        setHuntInfo(
          new HuntInfoFunction(
            'Discovered Treasure',
            'Discovered at',
            'CompletedAt',
            'Details',
            () => {}
          )
        );
        break;
    }
  }, [type]);

  const getAndSetHunts = async () => {
    setHunts(await getHunts());
  };

  const getHunts = async (): Promise<any[]> => {
    if (!type) {
      return [];
    }

    return await getPlayerHunts(
      ApiNames.TREASURE_HUNT,
      `/players/${auth.user.getUsername()}/hunts?type=${type}`,
      {
        headers: {
          Authorization: 'Bearer ' + auth.jwtToken,
          'Content-Type': 'application/json',
        },
      }
    );
  };

  const updateHunt = async (huntID: string, type: HuntType): Promise<void> => {
    await updatePlayerHunt(
      ApiNames.TREASURE_HUNT,
      `/players/${auth.user.getUsername()}/hunts/${huntID}`,
      {
        headers: {
          Authorization: 'Bearer ' + auth.jwtToken,
          'Content-Type': 'application/json',
        },
        body: {
          type,
        },
      }
    );
  };

  const renderButton = (huntID: string): ReactElement => {
    switch (huntInfo?.buttonType) {
      case ButtonType.LINK:
        let huntInfoLink = huntInfo as HuntInfoLink;
        return (
          <LinkButton
            huntID={huntID}
            text={huntInfoLink.buttonText}
            link={huntInfoLink.createURL({
              pathParams: {
                game: huntID,
              },
            })}
            onClickHandler={huntInfoLink.onClickHandler}
          ></LinkButton>
        );
      case ButtonType.FUNCTION:
        let huntInfoFunction = huntInfo as HuntInfoFunction;
        return (
          <FunctionButton
            huntID={huntID}
            text={huntInfoFunction.buttonText}
            onClickHandler={huntInfoFunction.onClickHandler}
          ></FunctionButton>
        );
      default:
        return <></>;
    }
  };

  return (
    <>
      <Box className={classes.mainContentContainer}>
        <Box className={classes.mainContent}>
          <h2 className={classes.title}>{huntInfo?.title}</h2>
          {type && hunts?.items?.length > 0 && huntInfo && (
            <List>
              {hunts?.items?.map((item: any, index: number) => {
                const isLastItem = index === hunts.items.length - 1;
                return (
                  <Box
                    marginBottom={!isLastItem ? '1rem' : '0'}
                    key={item.HuntID}
                  >
                    <Hunt
                      hunt={item}
                      timestampText={huntInfo.timestampText}
                      timestampField={huntInfo.timestampField}
                    >
                      {renderButton(item.HuntID)}
                    </Hunt>
                  </Box>
                );
              })}
            </List>
          )}
        </Box>
      </Box>

      <Box className={classes.navigation}>
        <HuntTypeTabs tabValue={tabValue}></HuntTypeTabs>
      </Box>
    </>
  );
}
