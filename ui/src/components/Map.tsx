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
} from 'react-map-gl';
import amplifyConfig from '../amplify-config';
import { environment } from '../environment';
import { useAuth } from '../auth/use-auth';
import {
  Button,
  createStyles,
  Link,
  makeStyles,
  Theme,
} from '@material-ui/core';
import HomeIcon from '@material-ui/icons/Home';
import { Link as RouterLink } from 'react-router-dom';

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
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

const Map = () => {
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
  }, [auth.credentials]);

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

  const goToDC = () => {
    setViewport({
      ...viewport,
      longitude: -77.0369,
      latitude: 38.9072,
      zoom: 14,
      bearing: 0,
      transitionDuration: 2000,
      transitionInterpolator: flyToInterpolator,
      transitionEasing: easeCubic,
    });
  };

  return (
    <>
      {isMapViewable(auth.userGroups) && transformRequest && (
        <ReactMapGL
          {...viewport}
          width="100%"
          height="100vh"
          style={{ position: 'absolute', top: 0 }}
          transformRequest={transformRequest}
          mapStyle={environment.mapName}
          onViewportChange={(viewstate: ViewState) => {
            setViewport(viewstate);
            setCounter(counter + 1);
            if (counter % 10 === 0) {
              setRotation(rotation + 10);
            }
          }}
        >
          <div style={{ position: 'absolute', left: 20, top: 20 }}>
            <NavigationControl showCompass={true} />
            <GeolocateControl
              style={geolocateStyle}
              positionOptions={positionOptions}
              showAccuracyCircle={false}
              trackUserLocation={false}
              auto
              onViewportChange={(viewstate: ViewState) => {
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
          <div className="goto-user">
            <Button
              className={classes.mapButton + ' goto-user-btn'}
              variant="contained"
              size="small"
              onClick={goToDC}
            >
              Washington, DC
            </Button>
          </div>
          <Link component={RouterLink} to="/hunts?type=started">
            <Button
              variant="contained"
              className={classes.mapButton + ' ' + classes.homeButton}
            >
              <HomeIcon />
            </Button>
          </Link>
        </ReactMapGL>
      )}
    </>
  );
};

export default Map;
