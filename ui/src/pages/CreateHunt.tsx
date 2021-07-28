import {
  Box,
  Button,
  CircularProgress,
  createStyles,
  Link,
  Snackbar,
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
import Map from '../components/Map';
import { useState } from 'react';
import { getUser } from '../api/getUser';
import { searchPlaceIndex } from '../api/searchPlaceIndex';
import { CognitoIdentityServiceProvider } from 'aws-sdk';
import { Link as RouterLink, useParams } from 'react-router-dom';
import ArrowBackIcon from '@material-ui/icons/ArrowBack';
import './CreateHunt.css';
import ImageIcon from '@material-ui/icons/Image';
import { Alert } from '@material-ui/lab';
import { Storage } from 'aws-amplify';

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    title: { textAlign: 'center', margin: '0.75rem 0 0' },
    submitButton: {
      margin: '1rem 0',
    },
    map: {
      flexGrow: 1,
      minWidth: 350,
      minHeight: '70vh',
      margin: '1rem',
      boxShadow: theme.shadows[4],
    },
    mapButton: {
      backgroundColor: theme.palette.background.paper,
      '&:hover': {
        backgroundColor: theme.palette.grey[200],
      },
    },
    backButton: {
      backgroundColor: theme.palette.background.paper,
      minWidth: 40,
      width: 40,
      height: 40,
      borderRadius: '50%',
      position: 'absolute',
      top: 20,
      left: 20,

      '&:hover': {
        backgroundColor: theme.palette.grey[200],
      },
    },
    imageContainer: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 4,
      minWidth: 200,
      minHeight: 200,
      padding: '1rem',
      boxSizing: 'content-box',
      border: `1px solid ${theme.palette.grey[400]}`,
    },
    imageIcon: {
      width: 150,
      height: 150,
    },
    image: {
      maxWidth: 200,
      maxHeight: 200,
    },
    imageInput: {
      display: 'none',
    },
    imageButton: {
      marginTop: '0.75rem',
    },
    playerInfoButton: {
      margin: '0.25rem 0 0.5rem',
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

      setIsCreatingHunt(true);

      try {
        if (!imageFile) {
          throw new Error();
        }

        const { huntID } = await createHunt(ApiNames.TREASURE_HUNT, '/hunts', {
          headers: {
            Authorization: 'Bearer ' + auth.jwtToken,
            'Content-Type': 'application/json',
          },
          body,
        });

        const res = await Storage.put(`${playerID}/${huntID}`, imageFile);
        console.log(res);

        setSnackbarMessage('Treasure hunt created!');
        setIsSuccess(true);
      } catch (err) {
        setSnackbarMessage('Failed to create treasure hunt!');
        setIsSuccess(false);
      } finally {
        setIsCreatingHunt(false);
        setIsSnackbarOpen(true);
      }
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
  const [imageSrc, setImageSrc] = useState<string>();
  const [imageFile, setImageFile] = useState<File>();
  const [imageFileName, setImageFileName] = useState<string>();
  const [isSnackbarOpen, setIsSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>();
  const [isSuccess, setIsSuccess] = useState<boolean>();
  const [isLoadingPlayer, setIsLoadingPlayer] = useState<boolean>(false);
  const [isCreatingHunt, setIsCreatingHunt] = useState<boolean>(false);

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
    setIsLoadingPlayer(true);

    let user: CognitoIdentityServiceProvider.AdminGetUserResponse;
    try {
      user = await getUser(ApiNames.TREASURE_HUNT, `/users/${username}`, {
        headers: {
          Authorization: 'Bearer ' + auth.jwtToken,
          'Content-Type': 'application/json',
        },
      });

      setSnackbarMessage('Player info retrieved!');
      setIsSuccess(true);
    } catch (err) {
      setSnackbarMessage('Failed to retrieve player info!');
      setIsSuccess(false);
      return;
    } finally {
      setIsLoadingPlayer(false);
      setIsSnackbarOpen(true);
    }

    const playerID = user.Username;
    setPlayerID(playerID);

    const zipCode = user.UserAttributes?.find((attr) =>
      attr.Name.includes('zipCode')
    )?.Value;

    if (!zipCode) {
      return;
    }

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

  const handleImageChange = (event: any) => {
    const files = event.target.files;

    if (!files || files.length === 0) {
      return;
    }

    const file = files[0];

    if (file) {
      setImageFile(file);
      setImageFileName(file.name);
      setImageSrc(URL.createObjectURL(file));
    }
  };

  const handleClose = (event?: React.SyntheticEvent, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }

    setIsSnackbarOpen(false);
  };

  return (
    <Box p={2} position="relative">
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

      <Link component={RouterLink} to="/logs">
        <Button variant="contained" className={classes.backButton}>
          <ArrowBackIcon />
        </Button>
      </Link>

      <Typography className={classes.title} variant="h5" component="h2">
        Create Treasure Hunt
      </Typography>

      <Box display="flex" flexWrap="wrap" justifyContent="center" p={2}>
        <Box display="flex" flexWrap="wrap" justifyContent="center">
          <Box marginTop="1rem" padding="0 1rem">
            <Box className={classes.imageContainer}>
              {imageSrc ? (
                <img src={imageSrc} className={classes.image} />
              ) : (
                <ImageIcon className={classes.imageIcon} />
              )}
            </Box>
            <input
              accept="image/*"
              className={classes.imageInput}
              id="uploadButton"
              type="file"
              onChange={handleImageChange}
            />
            <label htmlFor="uploadButton">
              <Button
                className={classes.imageButton}
                variant="contained"
                disableElevation
                fullWidth
                component="span"
              >
                Upload Image
              </Button>
            </label>
          </Box>

          <Box minWidth={300} maxWidth={500} padding="0 1rem">
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
                  disableElevation
                  fullWidth
                  className={classes.playerInfoButton}
                  onClick={() => getUserInfo(formik.values.playerEmail)}
                  disabled={isLoadingPlayer}
                >
                  {isLoadingPlayer ? (
                    <CircularProgress
                      style={{
                        width: 24.5,
                        height: 24.5,
                      }}
                    />
                  ) : (
                    'Get Player Info'
                  )}
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
                  disableElevation
                  fullWidth
                  type="submit"
                  disabled={isCreatingHunt}
                >
                  {isCreatingHunt ? (
                    <CircularProgress
                      style={{
                        width: 24.5,
                        height: 24.5,
                      }}
                    />
                  ) : (
                    'Submit'
                  )}
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
