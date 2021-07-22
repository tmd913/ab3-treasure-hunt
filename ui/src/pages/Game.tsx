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
import { Link as RouterLink } from 'react-router-dom';
import { useState } from 'react';
import { useEffect } from 'react';

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
  const classes = useStyles();
  // const { huntID } = useParams<{ huntID: string }>();

  const [geojson, setGeojson] = useState<
    GeoJSON.Feature<GeoJSON.LineString, GeoJSON.GeoJsonProperties>
  >({
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: [[-77.0547, 38.9024]],
    },
  });

  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     const coordinates: GeoJSON.Position[] = geojson.geometry.coordinates;
  //     const len = coordinates.length;
  //     const nextLocation = createMockLocation(coordinates[len - 1]);
  //     coordinates.push(nextLocation);

  //     const replacement: GeoJSON.Feature<
  //       GeoJSON.LineString,
  //       GeoJSON.GeoJsonProperties
  //     > = {
  //       ...geojson,
  //       ...{ geometry: { type: 'LineString', coordinates } },
  //     };

  //     setGeojson(Object.assign({}, replacement));
  //   }, 5000);

  //   setTimeout(() => clearInterval(interval), 60000);
  // }, []);

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

  const getLocations = (
    playerID: string,
    huntID: string
  ): [number, number][] => {
    return [];
  };

  const addLocation = async (
    playerID: string,
    huntID: string,
    location: { longitude: number; latitude: number }
  ): Promise<void> => {};

  return (
    <>
      <Box className={classes.map}>
        <Map
          geojson={geojson}
          handleLocationChange={(newLocation: GeoJSON.Position) => {
            const coordinates: GeoJSON.Position[] =
              geojson.geometry.coordinates;
            const nextLocation = newLocation;
            coordinates.push(nextLocation);

            const replacement: GeoJSON.Feature<
              GeoJSON.LineString,
              GeoJSON.GeoJsonProperties
            > = {
              ...geojson,
              ...{ geometry: { type: 'LineString', coordinates } },
            };

            setGeojson(Object.assign({}, replacement));
          }}
          createMockLocation={createMockLocation}
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
