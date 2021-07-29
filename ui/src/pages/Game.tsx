// import { useParams } from 'react-router-dom';
import {
  Box,
  Button,
  createStyles,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Link,
  makeStyles,
  Slide,
  Theme,
  Typography,
} from '@material-ui/core';
import Map from '../components/Map';
import ArrowBackIcon from '@material-ui/icons/ArrowBack';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { useState } from 'react';
import { useEffect } from 'react';
import { getPlayerHunt } from '../api/getPlayerHunt';
import { ApiNames } from '../api/ApiNames.enum';
import { useAuth } from '../auth/use-auth';
import Location from '../shared/interfaces/Location';
import { updatePlayerHunt } from '../api/updatePlayerHunt';
import confetti from 'canvas-confetti';
import React from 'react';
import { TransitionProps } from '@material-ui/core/transitions';
import GameResponse from '../shared/interfaces/GameResponse';
import { Storage } from 'aws-amplify';
import { Skeleton } from '@material-ui/lab';

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    map: {
      width: '100%',
      height: '100vh',
      position: 'absolute',
      top: 0,
    },
    mapButton: {
      backgroundColor: theme.palette.background.paper,
      '&:hover': {
        backgroundColor: theme.palette.grey[200],
      },
    },
    backButton: {
      minWidth: 40,
      width: 40,
      height: 40,
      borderRadius: '50%',
      position: 'absolute',
      top: 20,
      left: 20,
    },
    distanceContainer: {
      position: 'absolute',
      top: 20,
      width: '100%',
      display: 'flex',
      justifyContent: 'center',
      pointerEvents: 'none',
    },
    distance: {
      backgroundColor: theme.palette.primary.main,
      color: theme.palette.background.paper,
      boxShadow: theme.shadows[2],
      padding: '0.25rem 0.75rem',
      borderRadius: 4,
      zIndex: 99,
    },
    dialog: {
      backgroundColor: 'rgb(252,246,186)',
      background:
        'linear-gradient(150deg, rgba(252,246,186,1) 0%, rgba(252,246,186,1) 5%, rgba(170,119,28,1) 100%)',
    },
    dialogCard: {
      backgroundColor: 'rgb(252,246,186)',
      background:
        'linear-gradient(150deg, rgba(252,246,186,1) 0%, rgba(252,246,186,1) 5%, rgba(170,119,28,1) 100%)',
      padding: '0.5rem',
    },
    dialogContent: {
      margin: '0 0 1rem 0',
    },
    dialogTitle: {
      textAlign: 'center',
    },
    treasureImage: {
      fontSize: '8rem',
    },
    imageContainer: {
      display: 'flex',
      justifyContent: 'center',
      marginBottom: '1rem',
    },
    imageWrapper: {
      borderRadius: 4,
      width: 200,
      height: 200,
      boxSizing: 'content-box',
      padding: '1rem',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: theme.palette.background.paper,
      boxShadow: theme.shadows[4],
    },
    image: {
      maxWidth: 200,
      maxHeight: 200,
    },
    skeleton: {
      borderRadius: 4,
      width: 200,
      height: 200,
      boxSizing: 'content-box',
      padding: '1rem',
    },
    treasureDescriptionContainer: {
      display: 'flex',
      justifyContent: 'center',
    },
    treasureDescription: {
      width: '100%',
      maxWidth: 450,
      boxSizing: 'content-box',
      marginTop: '1rem',
      padding: '1rem',
      borderRadius: 4,
      background: theme.palette.background.paper,
      boxShadow: theme.shadows[4],
    },
  })
);

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & { children?: React.ReactElement<any, any> },
  ref: React.Ref<unknown>
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const Game = () => {
  const auth = useAuth();
  const classes = useStyles();
  const { huntID } = useParams<{ huntID: string }>();

  const [geojson, setGeojson] =
    useState<GeoJSON.Feature<GeoJSON.LineString, GeoJSON.GeoJsonProperties>>();
  const [isWinner, setIsWinner] = useState<boolean>(false);
  const [treasureDistance, setTreasureDistance] = useState<number>();
  const [treasureDescription, setTreasureDescription] = useState<string>();
  const [open, setOpen] = React.useState(false);
  const [isTreasureLoading, setIsTreasureLoading] = useState<boolean>(false);
  const [treasureImage, setTreasureImage] = useState<Object | string>();

  useEffect(() => {
    const getExistingLocations = async () => {
      const locations = await getLocations(auth.user.getUsername(), huntID);

      const defaultGeojson: GeoJSON.Feature<
        GeoJSON.LineString,
        GeoJSON.GeoJsonProperties
      > = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [],
        },
      };

      setGeojson(buildGeojson(locations, defaultGeojson));
    };

    getExistingLocations();
  }, []);

  useEffect(() => {
    if (isWinner) {
      getTreasureImage(huntID);

      setOpen(true);
      setTimeout(() => {
        celebrate();
      }, 300);
      setTimeout(() => {
        fireworks();
      }, 600);
    }
  }, [isWinner]);

  const getLocations = async (
    playerID: string,
    huntID: string
  ): Promise<[number, number][]> => {
    const hunt = await getPlayerHunt(
      ApiNames.TREASURE_HUNT,
      `/players/${playerID}/hunts/${huntID}`,
      {
        headers: {
          Authorization: 'Bearer ' + auth.jwtToken,
          'Content-Type': 'application/json',
        },
      }
    );

    return hunt.item.PlayerLocations.length === 0
      ? []
      : hunt.item.PlayerLocations.map((location: Location) => [
          location.longitude,
          location.latitude,
        ]);
  };

  const addLocation = async (
    playerID: string,
    huntID: string,
    location: { longitude: number; latitude: number }
  ): Promise<GameResponse> => {
    const gameResponse: GameResponse = await updatePlayerHunt(
      ApiNames.TREASURE_HUNT,
      `/players/${playerID}/hunts/${huntID}`,
      {
        headers: {
          Authorization: 'Bearer ' + auth.jwtToken,
          'Content-Type': 'application/json',
        },
        body: {
          location,
        },
      }
    );

    setTreasureDistance(gameResponse.treasureDistance);

    if (gameResponse.isWinner) {
      setTreasureDescription(gameResponse.treasureDescription);
      setIsWinner(true);
    }

    return gameResponse;
  };

  const handleLocationChange = async (newLocation: GeoJSON.Position) => {
    if (!geojson) {
      return {};
    }

    const gameResponse = await addLocation(auth.user.getUsername(), huntID, {
      longitude: newLocation[0],
      latitude: newLocation[1],
    });

    setGeojson(Object.assign({}, buildGeojson([newLocation], geojson)));

    return gameResponse;
  };

  const buildGeojson = (
    newLocations: GeoJSON.Position[],
    geojson: GeoJSON.Feature<GeoJSON.LineString, GeoJSON.GeoJsonProperties>
  ): GeoJSON.Feature<GeoJSON.LineString, GeoJSON.GeoJsonProperties> => {
    const coordinates: GeoJSON.Position[] = [
      ...geojson.geometry.coordinates,
      ...newLocations,
    ];

    return {
      ...geojson,
      ...{ geometry: { type: 'LineString', coordinates } },
    };
  };

  const createMockLocation = (
    previousLocation: GeoJSON.Position
  ): GeoJSON.Position => {
    const [prevLong, prevLat] = previousLocation;

    let isPositive = Boolean(Math.floor(Math.random() * 2));
    const nextLong = prevLong + (Math.random() / 100) * (isPositive ? 1 : -1);

    isPositive = Boolean(Math.floor(Math.random() * 2));
    const nextLat = prevLat + (Math.random() / 100) * (isPositive ? 1 : -1);

    return [nextLong, nextLat];
  };

  const getTreasureImage = async (huntID: string) => {
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
  };

  const fireworks = () => {
    var duration = 3000;
    var animationEnd = Date.now() + duration;
    var defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min;
    };

    const interval: NodeJS.Timeout = setInterval(function () {
      var timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      var particleCount = 50 * (timeLeft / duration);
      // since particles fall down, start a bit higher than random
      confetti(
        Object.assign({}, defaults, {
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
          zIndex: 9999,
        })
      );
      confetti(
        Object.assign({}, defaults, {
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
          zIndex: 9999,
        })
      );
    }, 250);
  };

  const celebrate = () => {
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
    };

    const fire = (particleRatio: number, opts: any) => {
      confetti(
        Object.assign({}, defaults, opts, {
          particleCount: Math.floor(count * particleRatio),
          zIndex: 9999,
        })
      );
    };

    fire(0.25, {
      spread: 26,
      startVelocity: 55,
    });
    fire(0.2, {
      spread: 60,
    });
    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8,
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2,
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 45,
    });
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <>
      <Box className={classes.map}>
        <Map
          geojson={geojson}
          handleLocationChange={handleLocationChange}
          createMockLocation={createMockLocation}
          isWinner={isWinner}
        ></Map>
      </Box>

      <Link component={RouterLink} to="/hunts?type=started">
        <Button
          variant="contained"
          className={classes.mapButton + ' ' + classes.backButton}
        >
          <ArrowBackIcon />
        </Button>
      </Link>

      {treasureDistance && (
        <Box className={classes.distanceContainer}>
          <Typography variant="h6" component="h2" className={classes.distance}>
            {treasureDistance.toLocaleString()} meters away
          </Typography>
        </Box>
      )}

      <Dialog
        className={classes.dialog}
        open={open}
        TransitionComponent={Transition}
        keepMounted
        onClose={handleClose}
        aria-labelledby="alert-dialog-slide-title"
        aria-describedby="alert-dialog-slide-description"
      >
        <Box className={classes.dialogCard}>
          <DialogTitle
            className={classes.dialogTitle}
            id="alert-dialog-slide-title"
          >
            You discovered treasure!
          </DialogTitle>

          <DialogContent className={classes.dialogContent}>
            <Box className={classes.imageContainer}>
              {isTreasureLoading ? (
                <Skeleton className={classes.skeleton} variant="rect" />
              ) : (
                treasureImage && (
                  <Box className={classes.imageWrapper}>
                    <img
                      src={treasureImage.toString()}
                      className={classes.image}
                    />
                  </Box>
                )
              )}
            </Box>

            <Box className={classes.treasureDescriptionContainer}>
              <Typography className={classes.treasureDescription}>
                {treasureDescription}
              </Typography>
            </Box>
          </DialogContent>

          <DialogActions>
            <Button
              variant="contained"
              color="primary"
              component={RouterLink}
              to="/hunts?type=completed"
            >
              Explore Treasure
            </Button>
            <Button onClick={handleClose} variant="contained" color="secondary">
              Close
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </>
  );
};

export default Game;
