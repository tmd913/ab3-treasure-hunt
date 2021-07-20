import {
  Box,
  Button,
  Drawer,
  List,
  makeStyles,
  Typography,
} from '@material-ui/core';
import { createStyles } from '@material-ui/styles';
import { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { getPlayerHunts } from '../api';
import { ApiNames } from '../api/ApiNames.enum';
import { useAuth } from '../auth/use-auth';
import Hunt from '../components/Hunt';
import { useQuery } from '../utils';
import HuntCardConfig from '../shared/classes/HuntCardConfig';
import { HuntType } from '../shared/enums/HuntType';
import HuntTypeTabs from '../components/HuntTypeTabs';
import { updatePlayerHunt } from '../api/updatePlayerHunt';
import LinkButtonConfig from '../shared/classes/LinkButtonConfig';
import FunctionButtonConfig from '../shared/classes/FunctionButtonConfig';
import ButtonConfig, { ButtonType } from '../shared/classes/ButtonConfig';
import Skeleton from '@material-ui/lab/Skeleton';
import { useHistory } from 'react-router-dom';
import ImageIcon from '@material-ui/icons/Image';

const useStyles = makeStyles(() =>
  createStyles({
    mainContentContainer: {
      width: '100%',
      display: 'flex',
      justifyContent: 'center',
      paddingBottom: 72,
    },
    mainContent: {
      width: '100%',
      maxWidth: '600px',
      padding: '0 1rem',
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
      padding: '1.5rem',
    },
    treasureDrawer: {
      width: '75vw',
      maxWidth: 400,
    },
    treasureImage: {
      fontSize: '8rem',
    },
  })
);

export default function PlayerHunts() {
  const auth = useAuth();
  const classes = useStyles();
  const query = useQuery();
  const history = useHistory();

  const [type, setType] = useState<HuntType>();
  const [hunts, setHunts] = useState<any>();
  const [huntCardConfig, setHuntCardConfig] = useState<HuntCardConfig>();
  const [tabValue, setTabValue] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isTreasureOpen, setIsTreasureOpen] = useState<boolean>(false);
  const [currentTreasure, setCurrentTreasure] = useState<any>();

  useEffect(() => {
    const type = query.get('type')?.toUpperCase() as HuntType;

    if (!type) {
      return;
    }

    setType(HuntType[type]);
  }, [query]);

  useEffect(() => {
    getAndSetHunts();
  }, [type]);

  useEffect(() => {
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
            [
              new FunctionButtonConfig(
                'Details',
                'primary',
                (huntID: string) => {
                  const items = hunts?.items || [];
                  const treasure = items.find(
                    (hunt: any) => hunt.HuntID === huntID
                  );
                  setCurrentTreasure(treasure);
                  toggleDrawer(true);
                }
              ),
            ]
          )
        );
        break;
    }
  }, [type, hunts]);

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
          <Button
            key={key}
            variant="contained"
            disableElevation
            color={linkButtonConfig.color}
            onClick={() => {
              linkButtonHandler(
                huntID,
                linkButtonConfig.createURL({
                  pathParams: {
                    game: huntID,
                  },
                }),
                linkButtonConfig.onClickHandler
              );
            }}
          >
            {linkButtonConfig.text}
          </Button>
        );
      case ButtonType.FUNCTION:
        const functionButtonConfig = buttonConfig as FunctionButtonConfig;
        return (
          <Button
            key={key}
            variant="contained"
            disableElevation
            color={functionButtonConfig.color}
            onClick={() => {
              functionButtonConfig.onClickHandler(huntID);
            }}
          >
            {functionButtonConfig.text}
          </Button>
        );
      default:
        return <></>;
    }
  };

  const linkButtonHandler = (
    huntID: string,
    link: string,
    onClickHandler?: Function
  ) => {
    if (onClickHandler) {
      onClickHandler(huntID);
    }

    history.push(link);
  };

  const toggleDrawer = (
    isOpen: boolean,
    event?: React.KeyboardEvent | React.MouseEvent
  ) => {
    if (
      event?.type === 'keydown' &&
      ((event as React.KeyboardEvent).key === 'Tab' ||
        (event as React.KeyboardEvent).key === 'Shift')
    ) {
      return;
    }

    setIsTreasureOpen(isOpen);
  };

  return (
    <>
      <Box className={classes.mainContentContainer}>
        <Box className={classes.mainContent}>
          <h2 className={classes.title}>{huntCardConfig?.title}</h2>
          <List>
            {isLoading ? (
              [0, 1, 2].map((i) => (
                <Box marginBottom="1rem" key={'skeleton#' + i}>
                  <Skeleton
                    className={classes.skeleton}
                    variant="rect"
                    height={77}
                  />
                </Box>
              ))
            ) : type && hunts?.items?.length > 0 && huntCardConfig ? (
              hunts.items.map((item: any, index: number) => (
                <Box marginBottom="1rem" key={item.HuntID}>
                  <Hunt
                    hunt={item}
                    timestampText={huntCardConfig.timestampText}
                    timestampField={huntCardConfig.timestampField}
                  >
                    {huntCardConfig?.buttonConfigs.map((buttonConfig, index) =>
                      renderButton(
                        item.HuntID,
                        item.HuntID + '#' + index,
                        buttonConfig
                      )
                    )}
                  </Hunt>
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

      <Drawer
        anchor="right"
        open={isTreasureOpen}
        onClose={(event: React.KeyboardEvent | React.MouseEvent) =>
          toggleDrawer(false, event)
        }
      >
        <Box p={2} className={classes.treasureDrawer}>
          <Typography variant="h4">Treasure</Typography>
          <ImageIcon className={classes.treasureImage}></ImageIcon>
          <Typography>{currentTreasure?.TreasureDescription}</Typography>
        </Box>
      </Drawer>

      <Box className={classes.navigation}>
        <HuntTypeTabs tabValue={tabValue}></HuntTypeTabs>
      </Box>
    </>
  );
}
