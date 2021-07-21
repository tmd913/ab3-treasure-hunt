import {
  Box,
  Button,
  createStyles,
  TextField,
  Theme,
  Typography,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/styles';
import * as yup from 'yup';
import { useFormik } from 'formik';
import { createHunt } from '../api/createHunt';
import { ApiNames } from '../api/ApiNames.enum';
import { useAuth } from '../auth/use-auth';
import { AmplifyS3ImagePicker } from '@aws-amplify/ui-react';
import Map from '../components/Map';
import { useState } from 'react';
import { getUser } from '../api/getUser';
import { searchPlaceIndex } from '../api/searchPlaceIndex';
import { CognitoIdentityServiceProvider } from 'aws-sdk';

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    title: { textAlign: 'center', margin: '1rem 0' },
    submitButton: {
      marginTop: '2rem',
    },
    map: {
      flexGrow: 1,
      minWidth: 400,
      minHeight: '60vh',
      marginTop: '1rem',
      boxShadow: theme.shadows[4],
    },
    mapButton: {
      backgroundColor: theme.palette.background.paper,
      '&:hover': {
        backgroundColor: theme.palette.grey[200],
      },
    },
  })
);

interface FormValues {
  treasureDescription: string;
  playerEmail: string;
  latitude: string;
  longitude: string;
  triggerDistance: string;
}

const validationSchema = yup.object({
  treasureDescription: yup
    .string()
    .required('Treasure description is required'),
  playerEmail: yup
    .string()
    .email('Enter a valid email')
    .required('Player email is required'),
  latitude: yup.number().min(-90).max(90).required('Latitude is required'),
  longitude: yup.number().min(-180).max(180).required('Longitude is required'),
  triggerDistance: yup
    .number()
    .positive('Enter a positive trigger distance')
    .required('Trigger distance is required'),
});

export default function CreateHunt() {
  const auth = useAuth();
  const classes = useStyles();
  const formik = useFormik({
    initialValues: {
      treasureDescription: '',
      playerEmail: '',
      latitude: '',
      longitude: '',
      triggerDistance: '',
    },
    validationSchema: validationSchema,
    onSubmit: async ({
      treasureDescription,
      playerEmail,
      latitude,
      longitude,
      triggerDistance,
    }: FormValues) => {
      const body = {
        treasureImage: 's3://url',
        treasureDescription,
        playerEmail,
        playerID,
        treasureLocation: {
          latitude,
          longitude,
        },
        triggerDistance,
      };

      await createHunt(ApiNames.TREASURE_HUNT, '/hunts', {
        headers: {
          Authorization: 'Bearer ' + auth.jwtToken,
          'Content-Type': 'application/json',
        },
        body,
      });

      formik.resetForm();
    },
  });

  const [marker, setMarker] = useState<{
    latitude: number;
    longitude: number;
  }>();

  const [playerLocation, setPlayerLocation] = useState<{
    latitude: number;
    longitude: number;
  }>();

  const [playerID, setPlayerID] = useState<string>();

  const handleMapClick = (e: any) => {
    console.log(e.lngLat);
    const [longitude, latitude]: number[] = e.lngLat;
    setMarker({
      latitude,
      longitude,
    });
    formik.setFieldValue('longitude', longitude);
    formik.setFieldValue('latitude', latitude);
  };

  const getUserInfo = async (username: string) => {
    const user: CognitoIdentityServiceProvider.AdminGetUserResponse =
      await getUser(ApiNames.TREASURE_HUNT, `/users/${username}`, {
        headers: {
          Authorization: 'Bearer ' + auth.jwtToken,
          'Content-Type': 'application/json',
        },
      });

    const playerID = user.Username;
    setPlayerID(playerID);

    const zipCode =
      user.UserAttributes?.find((attr) => attr.Name.includes('zipCode'))
        ?.Value || '19610';
    const playerCoords = await getCoordinatesFromZipCode(+zipCode);
    setPlayerLocation(playerCoords);
  };

  const getCoordinatesFromZipCode = (
    zipCode: number
  ): Promise<{ longitude: number; latitude: number }> => {
    return searchPlaceIndex(ApiNames.TREASURE_HUNT, `/places/${zipCode}`, {
      headers: {
        Authorization: 'Bearer ' + auth.jwtToken,
        'Content-Type': 'application/json',
      },
    });
  };

  return (
    <Box p={2}>
      <Typography className={classes.title} variant="h5" component="h2">
        Create Treasure Hunt
      </Typography>

      <Box display="flex" flexWrap="wrap" justifyContent="center" p={2}>
        <Box
          display="flex"
          justifyContent="center"
          minWidth={950}
          padding="0 1rem"
        >
          <Box marginTop="1rem" padding="0 1rem">
            <AmplifyS3ImagePicker />
          </Box>

          <Box minWidth={400} maxWidth={500} padding="0 1rem">
            <Box>
              <form onSubmit={formik.handleSubmit}>
                <TextField
                  variant="outlined"
                  multiline
                  rows={4}
                  fullWidth
                  margin="normal"
                  id="treasureDescription"
                  name="treasureDescription"
                  label="Treasure Description*"
                  value={formik.values.treasureDescription}
                  onChange={formik.handleChange}
                  error={
                    formik.touched.treasureDescription &&
                    Boolean(formik.errors.treasureDescription)
                  }
                  helperText={
                    formik.touched.treasureDescription &&
                    formik.errors.treasureDescription
                  }
                ></TextField>

                <TextField
                  variant="outlined"
                  fullWidth
                  margin="normal"
                  id="playerEmail"
                  name="playerEmail"
                  label="Player Email*"
                  value={formik.values.playerEmail}
                  onChange={formik.handleChange}
                  error={
                    formik.touched.playerEmail &&
                    Boolean(formik.errors.playerEmail)
                  }
                  helperText={
                    formik.touched.playerEmail && formik.errors.playerEmail
                  }
                ></TextField>

                <Button
                  variant="contained"
                  fullWidth
                  style={{ marginBottom: '1rem' }}
                  onClick={() => getUserInfo(formik.values.playerEmail)}
                >
                  Get Player Info
                </Button>

                <TextField
                  type="number"
                  variant="outlined"
                  fullWidth
                  margin="normal"
                  id="latitude"
                  name="latitude"
                  label="Latitude*"
                  value={formik.values.latitude}
                  onChange={formik.handleChange}
                  error={
                    formik.touched.latitude && Boolean(formik.errors.latitude)
                  }
                  helperText={formik.touched.latitude && formik.errors.latitude}
                ></TextField>

                <TextField
                  type="number"
                  variant="outlined"
                  fullWidth
                  margin="normal"
                  id="longitude"
                  name="longitude"
                  label="Longitude*"
                  value={formik.values.longitude}
                  onChange={formik.handleChange}
                  error={
                    formik.touched.longitude && Boolean(formik.errors.longitude)
                  }
                  helperText={
                    formik.touched.longitude && formik.errors.longitude
                  }
                ></TextField>

                <TextField
                  type="number"
                  variant="outlined"
                  fullWidth
                  margin="normal"
                  id="triggerDistance"
                  name="triggerDistance"
                  label="Trigger Distance (meters)*"
                  value={formik.values.triggerDistance}
                  onChange={formik.handleChange}
                  error={
                    formik.touched.triggerDistance &&
                    Boolean(formik.errors.triggerDistance)
                  }
                  helperText={
                    formik.touched.triggerDistance &&
                    formik.errors.triggerDistance
                  }
                ></TextField>

                <Button
                  className={classes.submitButton}
                  color="primary"
                  variant="contained"
                  fullWidth
                  type="submit"
                >
                  Submit
                </Button>
              </form>
            </Box>
          </Box>
        </Box>

        <Box className={classes.map}>
          <Map
            onMapClick={handleMapClick}
            marker={marker}
            playerLocation={playerLocation}
          ></Map>
        </Box>
      </Box>
    </Box>
  );
}
