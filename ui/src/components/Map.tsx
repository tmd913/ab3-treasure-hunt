import 'maplibre-gl/dist/maplibre-gl.css';
import { createRequestTransformer } from 'amazon-location-helpers';
import { easeCubic } from 'd3-ease';
import { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { ViewState } from 'react-map-gl/src/mapbox/mapbox';
import ReactMapGL, {
  FlyToInterpolator,
  GeolocateControl,
  NavigationControl,
  ViewportProps,
  Marker,
  Layer,
  Source,
  LayerProps,
} from 'react-map-gl';
import amplifyConfig from '../amplify-config';
import { environment } from '../environment';
import { useAuth } from '../auth/use-auth';
import { Button, createStyles, makeStyles, Theme } from '@material-ui/core';
import './Map.css';
import Pin from './Pin';
import HomeIcon from '@material-ui/icons/Home';
import ArrowUpwardIcon from '@material-ui/icons/ArrowUpward';

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    mapContainer: {
      position: 'relative',
      width: '100%',
      height: '100%',
    },
    mapButton: {
      backgroundColor: theme.palette.background.paper,
      '&:hover': {
        backgroundColor: theme.palette.grey[200],
      },
    },
    homeIcon: {
      backgroundColor: theme.palette.background.paper,
      boxShadow: theme.shadows[5],
      borderRadius: 4,
    },
    arrowIcon: {
      width: 30,
      height: 30,
      backgroundColor: theme.palette.background.paper,
      boxShadow: theme.shadows[5],
      borderRadius: '50%',
    },
  })
);

const geolocateStyle = {
  top: 100,
};

const layerStyle: LayerProps = {
  id: 'route',
  type: 'line',
  layout: {
    'line-join': 'round',
    'line-cap': 'round',
  },
  paint: {
    'line-color': '#007cbf',
    'line-width': 8,
  },
};

const positionOptions = { enableHighAccuracy: true };
const flyToInterpolator = new FlyToInterpolator();

const BASE_ROTATION = 360 - 112.5;

const Map = ({
  onMapClick,
  marker,
  playerLocation,
  geojson,
  handleLocationChange,
  createMockLocation,
}: {
  onMapClick?: Function;
  marker?: {
    latitude: number;
    longitude: number;
  };
  playerLocation?: {
    latitude: number;
    longitude: number;
  };
  geojson?: GeoJSON.Feature<GeoJSON.LineString, GeoJSON.GeoJsonProperties>;
  handleLocationChange?: Function;
  createMockLocation?: Function;
}) => {
  const auth = useAuth();

  const classes = useStyles();

  const [transformRequest, setRequestTransformer] = useState<Function>();

  const [viewport, setViewport] = useState<Partial<ViewportProps>>({
    longitude: -77.0369,
    latitude: 38.9072,
    zoom: 12,
  });

  const [heading, setHeading] = useState<number>();
  const [rotation, setRotation] = useState<number>(BASE_ROTATION);
  const [dot, setDot] = useState<Element>();
  const [current, setCurrent] = useState<Element>();
  const [counter, setCounter] = useState<number>(0);
  const [isAdmin, setIsAdmin] = useState<boolean>();
  const [data, setData] =
    useState<GeoJSON.Feature<GeoJSON.LineString, GeoJSON.GeoJsonProperties>>();

  useEffect(() => {
    if (!geojson) {
      return;
    }

    const replacement: GeoJSON.Feature<
      GeoJSON.LineString,
      GeoJSON.GeoJsonProperties
    > = {
      ...geojson,
      ...{
        geometry: {
          type: 'LineString',
          coordinates: [...geojson?.geometry.coordinates] || [],
        },
      },
    };

    setData(Object.assign({}, replacement));
  }, [geojson]);

  useEffect(() => {
    setIsAdmin(auth.userGroups?.includes('Admins'));
  }, [auth]);

  // create a new transformRequest function whenever the credentials change
  useEffect(() => {
    const makeRequestTransformer = async () => {
      if (auth.credentials) {
        const tr = await createRequestTransformer({
          credentials: auth.credentials,
          region: amplifyConfig.Auth.region,
        });
        // wrap the new value in an anonymous function to prevent React from recognizing it as a
        // function and immediately calling it
        setRequestTransformer(() => tr);
      }
    };

    makeRequestTransformer();
  }, [auth]);

  // useEffect(() => {
  //   if (dot) {
  //     const div = (
  //       <div className="radar-container">
  //         <svg
  //           className="radar"
  //           height="20"
  //           width="20"
  //           viewBox="0 0 20 20"
  //           transform={`rotate(${rotation})`}
  //         >
  //           <circle
  //             r="5"
  //             cx="50%"
  //             cy="50%"
  //             fill="transparent"
  //             stroke="rgba(235, 29, 29, 0.66)"
  //             strokeWidth="10"
  //             strokeDasharray="3.925 27.475"
  //           />
  //         </svg>
  //       </div>
  //     );
  //     ReactDOM.render(div, dot);
  //   }
  // }, [dot, rotation]);

  // useEffect(() => {
  //   if (current) {
  //     const div = (
  //       <div className="radar-container">
  //         <svg
  //           className="radar"
  //           height="20"
  //           width="20"
  //           viewBox="0 0 20 20"
  //           transform={`rotate(${rotation})`}
  //         >
  //           <circle
  //             r="5"
  //             cx="50%"
  //             cy="50%"
  //             fill="transparent"
  //             stroke="rgba(235, 29, 29, 0.66)"
  //             strokeWidth="10"
  //             strokeDasharray="3.925 27.475"
  //           />
  //         </svg>
  //       </div>
  //     );
  //     ReactDOM.render(div, current);
  //   }
  // }, [current, rotation]);

  useEffect(() => {
    document
      .querySelector('#arrowIcon')
      ?.setAttribute(
        'style',
        `transform: rotate(${rotation - BASE_ROTATION}deg)`
      );
  }, [current, rotation]);

  const isMapViewable = (groups?: string[]): boolean => {
    if (!groups || groups.length === 0) {
      return false;
    }

    return ['Players', 'Admins'].some((group) => groups.includes(group));
  };

  const flyToPlayerLocation = () => {
    if (
      !playerLocation ||
      playerLocation.latitude == null ||
      playerLocation.longitude == null
    ) {
      return;
    }

    setViewport({
      ...viewport,
      longitude: playerLocation.longitude,
      latitude: playerLocation.latitude,
      zoom: 14,
      bearing: 0,
      transitionDuration: 2000,
      transitionInterpolator: flyToInterpolator,
      transitionEasing: easeCubic,
    });
  };

  interface Location {
    latitude: number;
    longitude: number;
  }

  /**
   * Converts value from degrees to radians
   * @param deg Value in degrees
   * @returns Value in radians
   */
  const degToRad = (deg: number) => (deg * Math.PI) / 180;

  const calculateBearing = (
    startLocation: Location,
    endLocation: Location
  ): number => {
    const startLat = degToRad(endLocation.latitude);
    const startLong = degToRad(endLocation.longitude);
    const endLat = degToRad(startLocation.latitude);
    const endLong = degToRad(startLocation.longitude);
    const y = Math.sin(endLong - startLong) * Math.cos(endLat);
    const x =
      Math.cos(startLat) * Math.sin(endLat) -
      Math.sin(startLat) * Math.cos(endLat) * Math.cos(endLong - startLong);
    const initialBearingRad = Math.atan2(y, x);
    const initialBearing = ((initialBearingRad * 180) / Math.PI + 360) % 360; // in degrees
    const finalBearing = (initialBearing + 180) % 360;

    return Math.round(finalBearing);
  };

  return (
    <div className={classes.mapContainer}>
      {isMapViewable(auth.userGroups) && transformRequest && (
        <>
          <ReactMapGL
            {...viewport}
            width="100%"
            height="100%"
            transformRequest={transformRequest}
            mapStyle={environment.mapName}
            onViewportChange={(viewstate: ViewState) => {
              setViewport(viewstate);

              // if (!isAdmin) {
              //   setCounter(counter + 1);
              //   if (counter % 10 === 0) {
              //     setRotation(rotation + 10);
              //   }
              // }
              // console.log(viewstate.bearing);

              // setRotation(
              //   viewstate.bearing
              //     ? BASE_ROTATION - viewstate.bearing
              //     : BASE_ROTATION
              // );
              setRotation(
                heading
                  ? (BASE_ROTATION - (viewstate?.bearing || 0) + heading) % 360
                  : BASE_ROTATION
              );
            }}
            onClick={(e: any) => {
              if (onMapClick) {
                onMapClick(e);
              }
            }}
          >
            <Source id="my-data" type="geojson" data={data}>
              <Layer {...layerStyle} source="my-data" />
            </Source>

            <Marker
              longitude={
                geojson?.geometry.coordinates[
                  geojson.geometry.coordinates.length - 1
                ][0] || 0
              }
              latitude={
                geojson?.geometry.coordinates[
                  geojson.geometry.coordinates.length - 1
                ][1] || 0
              }
              offsetTop={-20}
              offsetLeft={-10}
            >
              <div className="current"></div>
              <ArrowUpwardIcon id="arrowIcon" className={classes.arrowIcon} />
            </Marker>

            <Marker
              longitude={geojson?.geometry.coordinates[0][0] || 0}
              latitude={geojson?.geometry.coordinates[0][1] || 0}
              offsetTop={-20}
              offsetLeft={-10}
            >
              <HomeIcon className={classes.homeIcon} />
            </Marker>

            {marker?.latitude && marker?.longitude && (
              <Marker
                longitude={marker.longitude}
                latitude={marker.latitude}
                offsetTop={-20}
                offsetLeft={-10}
              >
                <Pin size={20} />
              </Marker>
            )}

            <div style={{ position: 'absolute', left: 25, top: 80 }}>
              <NavigationControl showCompass={true} />
              <GeolocateControl
                style={geolocateStyle}
                positionOptions={positionOptions}
                showAccuracyCircle={false}
                trackUserLocation={true}
                auto={!isAdmin}
                onViewportChange={(viewstate: ViewState) => {
                  if (isAdmin) {
                    setViewport(viewstate);
                    return;
                  }

                  // if (!dot) {
                  //   const dotEl = document.querySelector(
                  //     '.mapboxgl-user-location-dot.mapboxgl-marker.mapboxgl-marker-anchor-center'
                  //   );
                  //   if (dotEl) {
                  //     dotEl.setAttribute('style', 'text-content: center');
                  //     setDot(dotEl);
                  //   }
                  // }

                  if (!current) {
                    const currentEl = document.querySelector('.current');
                    if (currentEl) {
                      currentEl.setAttribute('style', 'text-content: center');
                      setDot(currentEl);
                    }
                  }

                  if (!createMockLocation || !handleLocationChange) {
                    setViewport({
                      ...viewstate,
                      bearing: Math.random() * 360,
                      transitionDuration: 1000,
                      transitionInterpolator: flyToInterpolator,
                      transitionEasing: easeCubic,
                    });
                    return;
                  }

                  const coordinates = data?.geometry.coordinates || [];
                  const len = coordinates.length;
                  const startLocation: [number, number] = (coordinates[
                    len - 1
                  ] || [0, 0]) as [number, number];
                  const endLocation =
                    len > 0 ? createMockLocation(startLocation) : [0, 0];

                  handleLocationChange(endLocation);

                  const [endLongitude, endLatitude]: [number, number] =
                    endLocation;
                  const [startLongitude, startLatitude]: [number, number] =
                    startLocation;

                  const endLoc = {
                    longitude: endLongitude,
                    latitude: endLatitude,
                  };
                  const startLoc = {
                    longitude: startLongitude,
                    latitude: startLatitude,
                  };

                  const bearing = calculateBearing(startLoc, endLoc);
                  setHeading(bearing);

                  setViewport({
                    ...viewstate,
                    longitude: endLongitude,
                    latitude: endLatitude,
                    bearing,
                    transitionDuration: 1000,
                    transitionInterpolator: flyToInterpolator,
                    transitionEasing: easeCubic,
                  });
                }}
              />
            </div>
          </ReactMapGL>
          {isAdmin && playerLocation && (
            <div className="goto-user">
              <Button
                className={classes.mapButton + ' goto-user-btn'}
                variant="contained"
                size="small"
                onClick={flyToPlayerLocation}
              >
                Fly to Player Location
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Map;
