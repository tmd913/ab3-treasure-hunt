import React from 'react';
import './App.css';
import Amplify, { Auth, Hub } from 'aws-amplify';
import amplifyConfig from './amplify-config';
import { useEffect, useState } from 'react';
import { createRequestTransformer } from 'amazon-location-helpers';
import { ICredentials } from '@aws-amplify/core';
import { CognitoUser } from '@aws-amplify/auth';
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
import ReactDOM from 'react-dom';

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

  const [viewport, setViewport] = useState<Partial<ViewportProps>>({
    longitude: -77.0369,
    latitude: 38.9072,
    zoom: 12,
  });

  const [rotation, setRotation] = useState<number>(0);
  const [dot, setDot] = useState<Element>();
  const [counter, setCounter] = useState<number>(0);

  useEffect(() => {
    const fetchCredentials = async () => {
      setCredentials(await Auth.currentUserCredentials());
    };

    fetchCredentials();
    console.log(credentials);
  }, []);

  useEffect(() => {
    Hub.listen('auth', async ({ payload: { event, data } }) => {
      switch (event) {
        case 'cognitoHostedUI':
          let user: CognitoUser = await Auth.currentAuthenticatedUser();
          console.log(user.getSignInUserSession()?.getIdToken());
          console.log(
            user.getSignInUserSession()?.getIdToken()?.decodePayload()
          );
          break;
        case 'cognitoHostedUI_failure':
          console.error(data);
          break;
        default:
          break;
      }
    });
  }, []);

  // create a new transformRequest function whenever the credentials change
  // useEffect(() => {
  //   const makeRequestTransformer = async () => {
  //     if (credentials) {
  //       const tr = await createRequestTransformer({
  //         credentials,
  //         identityPoolId: amplifyConfig.Auth.identityPoolId,
  //         region: amplifyConfig.Auth.region,
  //       });
  //       // wrap the new value in an anonymous function to prevent React from recognizing it as a
  //       // function and immediately calling it
  //       setRequestTransformer(() => tr);
  //     }
  //   };

  //   makeRequestTransformer();
  // }, [credentials]);

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
      <button onClick={() => Auth.federatedSignIn()}>Sign In / Sign Up</button>
      <button onClick={() => Auth.signOut()}>Sign Out</button>
      {/* <div className="goto-user">
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
        </ReactMapGL>
      ) : (
        <h1>Loading...</h1>
      )} */}
    </div>
  );
};

export default App;
