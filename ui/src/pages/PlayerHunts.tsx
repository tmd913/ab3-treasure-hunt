import { Box, List, makeStyles, Typography } from '@material-ui/core';
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
import HuntCardConfig from '../shared/classes/HuntCardConfig';
import { HuntType } from '../shared/enums/HuntType';
import HuntTypeTabs from '../components/HuntTypeTabs';
import { updatePlayerHunt } from '../api/updatePlayerHunt';
import LinkButtonConfig from '../shared/classes/LinkButtonConfig';
import FunctionButtonConfig from '../shared/classes/FunctionButtonConfig';
import ButtonConfig, { ButtonType } from '../shared/classes/ButtonConfig';
import Skeleton from '@material-ui/lab/Skeleton';

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
    skeleton: {
      borderRadius: 4,
    },
    noHuntsText: {
      padding: '1rem',
    },
  })
);

export default function PlayerHunts() {
  const auth = useAuth();
  const classes = useStyles();
  const query = useQuery();

  const [type, setType] = useState<HuntType>();
  const [hunts, setHunts] = useState<any>();
  const [huntCardConfig, setHuntCardConfig] = useState<HuntCardConfig>();
  const [tabValue, setTabValue] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

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

    const gameUrl = '/games/:game';

    switch (type) {
      case HuntType.STARTED:
        setTabValue(0);
        setHuntCardConfig(
          new HuntCardConfig('Started Hunts', 'Started at', 'StartedAt', [
            new LinkButtonConfig('Resume', 'primary', gameUrl),
          ])
        );
        break;
      case HuntType.ACCEPTED:
        setTabValue(1);
        setHuntCardConfig(
          new HuntCardConfig('Accepted Hunts', 'Accepted at', 'AcceptedAt', [
            new LinkButtonConfig(
              'Start',
              'primary',
              gameUrl,
              (huntID: string) => {
                updateHunt(huntID, HuntType.STARTED);
              }
            ),
          ])
        );
        break;
      case HuntType.CREATED:
        setTabValue(2);
        setHuntCardConfig(
          new HuntCardConfig('Hunt Invites', 'Invited at', 'CreatedAt', [
            new FunctionButtonConfig(
              'Accept',
              'primary',
              async (huntID: string) => {
                await updateHunt(huntID, HuntType.ACCEPTED);
                getAndSetHunts();
              }
            ),
            new FunctionButtonConfig(
              'Deny',
              'secondary',
              async (huntID: string) => {
                await updateHunt(huntID, HuntType.DENIED);
                getAndSetHunts();
              }
            ),
          ])
        );
        break;
      case HuntType.COMPLETED:
        setTabValue(3);
        setHuntCardConfig(
          new HuntCardConfig(
            'Discovered Treasure',
            'Discovered at',
            'CompletedAt',
            [new FunctionButtonConfig('Details', 'primary', () => {})]
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

    setIsLoading(true);

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

    setIsLoading(false);

    return hunts;
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

  const renderButton = (
    huntID: string,
    key: string,
    buttonConfig: ButtonConfig
  ): ReactElement => {
    switch (buttonConfig.type) {
      case ButtonType.LINK:
        const linkButtonConfig = buttonConfig as LinkButtonConfig;
        return (
          <LinkButton
            key={key}
            huntID={huntID}
            text={linkButtonConfig.text}
            color={linkButtonConfig.color}
            link={linkButtonConfig.createURL({
              pathParams: {
                game: huntID,
              },
            })}
            onClickHandler={linkButtonConfig.onClickHandler}
          ></LinkButton>
        );
      case ButtonType.FUNCTION:
        const functionButtonConfig = buttonConfig as FunctionButtonConfig;
        return (
          <FunctionButton
            key={key}
            huntID={huntID}
            text={functionButtonConfig.text}
            color={functionButtonConfig.color}
            onClickHandler={functionButtonConfig.onClickHandler}
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
          <h2 className={classes.title}>{huntCardConfig?.title}</h2>
          <List>
            {type && hunts?.items?.length > 0 && huntCardConfig ? (
              hunts.items.map((item: any, index: number) => {
                const isLastItem = index === hunts.items.length - 1;
                return (
                  <Box
                    marginBottom={!isLastItem ? '1rem' : '0'}
                    key={item.HuntID}
                  >
                    <Hunt
                      hunt={item}
                      timestampText={huntCardConfig.timestampText}
                      timestampField={huntCardConfig.timestampField}
                    >
                      {huntCardConfig?.buttonConfigs.map(
                        (buttonConfig, index) =>
                          renderButton(
                            item.HuntID,
                            item.HuntID + '#' + index,
                            buttonConfig
                          )
                      )}
                    </Hunt>
                  </Box>
                );
              })
            ) : isLoading ? (
              [0, 1, 2].map((i) => (
                <Box marginBottom={i < 2 ? '1rem' : '0'} key={'skeleton#' + i}>
                  <Skeleton
                    className={classes.skeleton}
                    variant="rect"
                    height={77}
                  />
                </Box>
              ))
            ) : (
              <Typography className={classes.noHuntsText}>
                No {huntCardConfig?.title?.toLowerCase()}
              </Typography>
            )}
          </List>
        </Box>
      </Box>

      <Box className={classes.navigation}>
        <HuntTypeTabs tabValue={tabValue}></HuntTypeTabs>
      </Box>
    </>
  );
}
