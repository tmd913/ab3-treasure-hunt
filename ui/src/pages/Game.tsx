// import { useParams } from 'react-router-dom';
import {
  Box,
  Button,
  createStyles,
  IconButton,
  Link,
  makeStyles,
  Theme,
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
  })
);

const Game = () => {
  const auth = useAuth();
  const classes = useStyles();
  const { huntID } = useParams<{ huntID: string }>();

  const [geojson, setGeojson] =
    useState<GeoJSON.Feature<GeoJSON.LineString, GeoJSON.GeoJsonProperties>>();
  const [isWinner, setIsWinner] = useState<boolean>(false);

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
      console.log('you win!');
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
  ): Promise<{
    isWinner: boolean;
    treasureBearing: number;
    treasureDistance: number;
  }> => {
    const updateResponse = await updatePlayerHunt(
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

    console.log(updateResponse);

    if (updateResponse.isWinner) {
      setIsWinner(true);
    }

    return updateResponse;
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
    </>
  );
};

export default Game;
