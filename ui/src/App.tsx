import React from 'react';
import './App.css';
import Amplify, { Auth } from 'aws-amplify';
import amplifyConfig from './amplify-config';
import { useEffect, useState } from 'react';
import { createRequestTransformer } from 'amazon-location-helpers';
import { ICredentials } from '@aws-amplify/core';
import ReactMapGL, {
  NavigationControl,
  ViewportProps,
  FlyToInterpolator,
  GeolocateControl,
} from 'react-map-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
// 3rd-party easing functions
import { easeCubic } from 'd3-ease';
import { ViewState } from 'react-map-gl/src/mapbox/mapbox';

Amplify.configure(amplifyConfig);

const geolocateStyle = {
  top: 100,
};
const positionOptions = { enableHighAccuracy: true };
const flyToInterpolator = new FlyToInterpolator();

// Replace with the name of the map that you created on the Amazon Location Service console: https://console.aws.amazon.com/location/maps/home
const mapName = 'TreasureMap';

const App = () => {
  const [credentials, setCredentials] = useState<ICredentials>();
  const [transformRequest, setRequestTransformer] = useState<Function>();

  const [viewport, setViewport] = React.useState<Partial<ViewportProps>>({
    longitude: -77.0369,
    latitude: 38.9072,
    zoom: 12,
  });

  useEffect(() => {
    const fetchCredentials = async () => {
      setCredentials(await Auth.currentUserCredentials());
    };

    fetchCredentials();
  }, []);

  // create a new transformRequest function whenever the credentials change
  useEffect(() => {
    const makeRequestTransformer = async () => {
      if (credentials) {
        const tr = await createRequestTransformer({
          credentials,
          identityPoolId: amplifyConfig.Auth.identityPoolId,
          region: amplifyConfig.Auth.region,
        });
        // wrap the new value in an anonymous function to prevent React from recognizing it as a
        // function and immediately calling it
        setRequestTransformer(() => tr);
      }
    };

    makeRequestTransformer();
  }, [credentials]);

  const goToDC = () => {
    setViewport({
      ...viewport,
      longitude: -77.0369,
      latitude: 38.9072,
      zoom: 14,
      bearing: 0,
      transitionDuration: 5000,
      transitionInterpolator: flyToInterpolator,
      transitionEasing: easeCubic,
    });
  };

  return (
    <div>
      <div className="goto-user">
        <button className="goto-user-btn" onClick={goToDC}>
          Washington, DC
        </button>
      </div>
      {transformRequest ? (
        <ReactMapGL
          {...viewport}
          width="100%"
          height="100vh"
          transformRequest={transformRequest}
          mapStyle={mapName}
          onViewportChange={setViewport}
        >
          <div style={{ position: 'absolute', left: 20, top: 20 }}>
            <NavigationControl showCompass={true} />
            <GeolocateControl
              style={geolocateStyle}
              positionOptions={positionOptions}
              showAccuracyCircle={false}
              trackUserLocation={true}
              auto
              onViewportChange={(viewstate: ViewState) => {
                console.log(viewstate);
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
      ) : (
        <h1>Loading...</h1>
      )}
    </div>
  );
};

export default App;
