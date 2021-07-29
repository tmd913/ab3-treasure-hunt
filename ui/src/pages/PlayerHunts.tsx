import {
  Box,
  Button,
  List,
  makeStyles,
  Snackbar,
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
import { Alert } from '@material-ui/lab';
import CustomButtonConfig from '../shared/classes/InviteButtonConfig';
import { Storage } from 'aws-amplify';
import InviteButtonConfig from '../shared/classes/InviteButtonConfig';
import InviteButton from '../components/InviteButton';
import TreasureDrawer from '../components/TreasureDrawer';

const useStyles = makeStyles(() =>
  createStyles({
    mainContentContainer: {
      width: '100%',
      display: 'flex',
      justifyContent: 'center',
      paddingBottom: 80,
    },
    mainContent: {
      width: '100%',
      maxWidth: '600px',
      padding: '0 1rem',
    },
    title: {
      padding: '1.5rem 0 1rem 1.5rem',
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
  const [isTreasureLoading, setIsTreasureLoading] = useState<boolean>(true);
  const [isTreasureOpen, setIsTreasureOpen] = useState<boolean>(false);
  const [treasureDescription, setTreasureDescription] = useState<string>();
  const [treasureImage, setTreasureImage] = useState<Object | string>();
  const [isSnackbarOpen, setIsSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>();
  const [isSuccess, setIsSuccess] = useState<boolean>();

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
            new LinkButtonConfig('Resume', 'primary', gameUrl, () => {
              window.location.reload();
            }),
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
              async (huntID: string) => {
                await updateHunt(huntID, HuntType.STARTED);
                window.location.reload();
              }
            ),
          ])
        );
        break;
      case HuntType.CREATED:
        setTabValue(2);
        setHuntCardConfig(
          new HuntCardConfig('Hunt Invites', 'Invited at', 'CreatedAt', [
            new CustomButtonConfig('Accept', 'primary', HuntType.ACCEPTED),
            new CustomButtonConfig('Deny', 'secondary', HuntType.DENIED),
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
                async (huntID: string) => {
                  const items = hunts?.items || [];
                  const treasure = items.find(
                    (hunt: any) => hunt.HuntID === huntID
                  );

                  if (!treasure.TreasureDescription) {
                    return;
                  }

                  setTreasureDescription(treasure.TreasureDescription);

                  setIsTreasureOpen(true);

                  setIsTreasureLoading(true);
                  try {
                    const treasureImage = await Storage.get(
                      `${auth.user.getUsername()}/${huntID}`
                    );
                    setTreasureImage(treasureImage);
                  } catch (err) {
                    console.log('Failed to retrieve image!');
                    setTreasureImage(undefined);
                  } finally {
                    setIsTreasureLoading(false);
                  }
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

  const getHunts = async (): Promise<any> => {
    if (!type) {
      return [];
    }

    setIsLoading(true);

    let hunts;
    try {
      hunts = await getPlayerHunts(
        ApiNames.TREASURE_HUNT,
        `/players/${auth.user.getUsername()}/hunts?type=${type}`,
        {
          headers: {
            Authorization: 'Bearer ' + auth.jwtToken,
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (err) {
      hunts = { items: [] };
    } finally {
      setIsLoading(false);
    }

    return hunts;
  };

  const updateHunt = async (
    huntID: string,
    type: HuntType
  ): Promise<boolean> => {
    try {
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

      setSnackbarMessage('Hunt type updated!');
      setIsSuccess(true);
      setIsSnackbarOpen(true);
      return true;
    } catch (err) {
      setSnackbarMessage('Failed to updated hunt type!');
      setIsSuccess(false);
      setIsSnackbarOpen(true);
      return false;
    }
  };

  const filterHunts = (huntID: string) => {
    setHunts({
      ...hunts,
      ...{
        items: hunts.items.filter((hunt: any) => hunt.HuntID !== huntID),
      },
    });
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
      case ButtonType.INVITE:
        const inviteButtonConfig = buttonConfig as InviteButtonConfig;
        return (
          <InviteButton
            huntID={huntID}
            key={key}
            buttonConfig={inviteButtonConfig}
            updateHunt={updateHunt}
            updateType={inviteButtonConfig.updateType}
            filterHunts={filterHunts}
          />
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
    history.push(link);

    if (onClickHandler) {
      onClickHandler(huntID);
    }
  };

  const handleClose = (event?: React.SyntheticEvent, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }

    setIsSnackbarOpen(false);
  };

  const handleTreasureStateChange = (isOpen: boolean) => {
    if (!isOpen) {
      setTimeout(() => {
        if (isOpen) {
          return;
        }
        setTreasureImage(undefined);
        setTreasureDescription(undefined);
      }, 200);
    }

    setIsTreasureOpen(isOpen);
  };

  return (
    <>
      <Box className={classes.mainContentContainer}>
        <Snackbar
          open={isSnackbarOpen}
          autoHideDuration={6000}
          onClose={handleClose}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert
            elevation={6}
            variant="filled"
            onClose={handleClose}
            severity={isSuccess ? 'success' : 'error'}
          >
            {snackbarMessage}
          </Alert>
        </Snackbar>

        <Box className={classes.mainContent}>
          <Typography variant="h5" component="h2" className={classes.title}>
            {huntCardConfig?.title}
          </Typography>
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
              hunts.items.map((item: any) => (
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

      <TreasureDrawer
        isTreasureLoading={isTreasureLoading}
        isTreasureOpen={isTreasureOpen}
        treasureImage={treasureImage}
        treasureDescription={treasureDescription}
        handleTreasureStateChange={handleTreasureStateChange}
      />

      <Box className={classes.navigation}>
        <HuntTypeTabs tabValue={tabValue}></HuntTypeTabs>
      </Box>
    </>
  );
}
