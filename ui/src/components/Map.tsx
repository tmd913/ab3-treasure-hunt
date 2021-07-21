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
} from 'react-map-gl';
import amplifyConfig from '../amplify-config';
import { environment } from '../environment';
import { useAuth } from '../auth/use-auth';
import { Button, createStyles, makeStyles, Theme } from '@material-ui/core';
import './Map.css';
import Pin from './Pin';

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
    homeButton: {
      minWidth: 40,
      width: 40,
      height: 40,
      borderRadius: '50%',
      position: 'absolute',
      top: 20,
      right: 20,
    },
  })
);

const geolocateStyle = {
  top: 100,
};
const positionOptions = { enableHighAccuracy: true };
const flyToInterpolator = new FlyToInterpolator();

const Map = ({
  onMapClick,
  marker,
  playerLocation,
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
}) => {
  const auth = useAuth();

  const classes = useStyles();

  const [transformRequest, setRequestTransformer] = useState<Function>();

  const [viewport, setViewport] = useState<Partial<ViewportProps>>({
    longitude: -77.0369,
    latitude: 38.9072,
    zoom: 12,
  });

  const [rotation, setRotation] = useState<number>(0);
  const [dot, setDot] = useState<Element>();
  const [counter, setCounter] = useState<number>(0);
  const [isAdmin, setIsAdmin] = useState<boolean>();

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

  useEffect(() => {
    if (dot) {
      const div = (
        <div className="radar-container">
          <svg
            className="radar"
            height="20"
            width="20"
            viewBox="0 0 20 20"
            transform={`rotate(${rotation})`}
          >
            <circle
              r="5"
              cx="50%"
              cy="50%"
              fill="transparent"
              stroke="rgba(235, 29, 29, 0.66)"
              strokeWidth="10"
              strokeDasharray="3.925 27.475"
            />
          </svg>
        </div>
      );
      ReactDOM.render(div, dot);
    }
  }, [dot, rotation]);

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

              if (!isAdmin) {
                setCounter(counter + 1);
                if (counter % 10 === 0) {
                  setRotation(rotation + 10);
                }
              }
            }}
            onClick={(e: any) => {
              if (onMapClick) {
                onMapClick(e);
              }
            }}
          >
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
            <div style={{ position: 'absolute', left: 20, top: 20 }}>
              <NavigationControl showCompass={true} />
              <GeolocateControl
                style={geolocateStyle}
                positionOptions={positionOptions}
                showAccuracyCircle={false}
                trackUserLocation={false}
                auto={!isAdmin}
                onViewportChange={(viewstate: ViewState) => {
                  if (isAdmin) {
                    setViewport(viewstate);
                    return;
                  }

                  if (!dot) {
                    const dotEl = document.querySelector(
                      '.mapboxgl-user-location-dot.mapboxgl-marker.mapboxgl-marker-anchor-center'
                    );
                    if (dotEl) {
                      dotEl.setAttribute('style', 'text-content: center');
                      setDot(dotEl);
                    }
                  }

                  setViewport({
                    ...viewstate,
                    bearing: Math.random() * 360,
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
