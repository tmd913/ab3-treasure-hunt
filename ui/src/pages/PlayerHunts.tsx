import {
  Box,
  Button,
  ButtonTypeMap,
  CircularProgress,
  Drawer,
  ExtendButtonBase,
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
import ImageIcon from '@material-ui/icons/Image';
import { Alert } from '@material-ui/lab';
import CustomButtonConfig from '../shared/classes/CustomButtonConfig';
import { Storage } from 'aws-amplify';

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
    treasureDrawer: {
      width: '75vw',
      maxWidth: 600,
    },
    treasureImage: {
      fontSize: '8rem',
    },
    image: {
      maxWidth: 200,
      maxHeight: 200,
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
  const [treasureDescription, setTreasureDescription] = useState<string>();
  const [treasureImage, setTreasureImage] = useState<Object | string>();
  const [isSnackbarOpen, setIsSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>();
  const [isSuccess, setIsSuccess] = useState<boolean>();
  const [isAccepting, setIsAccepting] = useState<boolean>(false);
  const [isDenying, setIsDenying] = useState<boolean>(false);

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

        const createCustomButton =
          (isLoading: boolean) =>
          (huntID: string, key: string, buttonConfig: CustomButtonConfig) =>
            (
              <Button
                key={key}
                variant="contained"
                disableElevation
                color={buttonConfig.color}
                onClick={() => {
                  buttonConfig.onClickHandler(huntID);
                }}
                style={{ width: 82 }}
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? (
                  <CircularProgress
                    style={{
                      width: 24.5,
                      height: 24.5,
                    }}
                  />
                ) : (
                  buttonConfig.text
                )}
              </Button>
            );

        setHuntCardConfig(
          new HuntCardConfig('Hunt Invites', 'Invited at', 'CreatedAt', [
            new CustomButtonConfig(
              'Accept',
              'primary',
              async (huntID: string) => {
                setIsAccepting(true);
                const success = await updateHunt(huntID, HuntType.ACCEPTED);
                setIsAccepting(false);
                if (!success) {
                  return;
                }
                setHunts({
                  ...hunts,
                  ...{
                    items: hunts.items.filter(
                      (hunt: any) => hunt.HuntID !== huntID
                    ),
                  },
                });
              },
              createCustomButton
            ),
            new CustomButtonConfig(
              'Deny',
              'secondary',
              async (huntID: string) => {
                setIsDenying(true);
                const success = await updateHunt(huntID, HuntType.DENIED);
                setIsDenying(false);
                if (!success) {
                  return;
                }
                setHunts({
                  ...hunts,
                  ...{
                    items: hunts.items.filter(
                      (hunt: any) => hunt.HuntID !== huntID
                    ),
                  },
                });
              },
              createCustomButton
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
                async (huntID: string) => {
                  const items = hunts?.items || [];
                  const treasure = items.find(
                    (hunt: any) => hunt.HuntID === huntID
                  );

                  if (!treasure.TreasureDescription) {
                    return;
                  }

                  setTreasureDescription(treasure.TreasureDescription);

                  toggleDrawer(true);

                  const treasureImage = await Storage.get(
                    `${auth.user.getUsername()}/${huntID}`
                  );

                  if (treasureImage) {
                    setTreasureImage(treasureImage);
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
      case ButtonType.CUSTOM:
        const customButtonConfig = buttonConfig as CustomButtonConfig;
        return customButtonConfig.createCustomButton(
          buttonConfig.text === 'Accept' ? isAccepting : isDenying
        )(huntID, key, customButtonConfig);
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

  const handleClose = (event?: React.SyntheticEvent, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }

    setIsSnackbarOpen(false);
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

      <Drawer
        anchor="right"
        open={isTreasureOpen}
        onClose={(event: React.KeyboardEvent | React.MouseEvent) =>
          toggleDrawer(false, event)
        }
      >
        <Box p={2} className={classes.treasureDrawer}>
          <Typography variant="h5">Treasure</Typography>
          {/* <ImageIcon className={classes.treasureImage}></ImageIcon> */}
          {treasureImage && (
            <img src={treasureImage.toString()} className={classes.image} />
          )}
          <Typography>{treasureDescription}</Typography>
        </Box>
      </Drawer>

      <Box className={classes.navigation}>
        <HuntTypeTabs tabValue={tabValue}></HuntTypeTabs>
      </Box>
    </>
  );
}
