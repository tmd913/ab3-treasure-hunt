import {
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Portal,
  Snackbar,
  SwipeableDrawer,
  TextField,
  Theme,
  Typography,
} from '@material-ui/core';
import { createStyles, makeStyles } from '@material-ui/styles';
import { useState } from 'react';
import { useAuth } from './use-auth';
import MailIcon from '@material-ui/icons/Mail';
import AccountCircleIcon from '@material-ui/icons/AccountCircle';
import GroupIcon from '@material-ui/icons/Group';
import * as yup from 'yup';
import { useFormik } from 'formik';
import { ApiNames } from '../api/ApiNames.enum';
import { updateUser } from '../api/updateUser';
import { useEffect } from 'react';
import { Alert } from '@material-ui/lab';
import CloseIcon from '@material-ui/icons/Close';

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    drawer: {
      width: '100vw',
      maxWidth: 500,
      padding: '1rem 0.5rem',
    },
    list: {
      width: '100%',
      padding: '0.5rem 1rem',
    },
    iconButton: {
      color: 'white',
      '&:hover': {
        background: 'rgba(255, 255, 255, 0.3)',
      },
    },
    zipCodeHeader: {
      margin: '0.5rem 0 1rem',
      textAlign: 'center',
    },
    zipCodeInput: {
      margin: '0 0 1rem',
    },
    zipCodeButton: {
      marginBottom: '1rem',
    },
    signOutButton: {
      marginTop: '1.5rem',
    },
    closeIcon: {
      position: 'absolute',
      right: 0,
      top: 0,
      zIndex: 9999,
    },
  })
);

const validationSchema = yup.object({
  zipCode: yup
    .string()
    .length(5, 'Zip Code must be exactly 5 numbers')
    .matches(/^[0-9]{5}$/, {
      message: 'Zip Code must be exactly 5 numbers',
    })
    .required('Zip Code is required'),
});

const AuthButton = () => {
  const auth = useAuth();

  const classes = useStyles();

  const formik = useFormik({
    initialValues: {
      zipCode: '',
    },
    validationSchema: validationSchema,
    onSubmit: async ({ zipCode }: { zipCode: string }) => {
      const body = {
        zipCode,
      };

      setIsUpdating(true);

      try {
        await updateUser(
          ApiNames.TREASURE_HUNT,
          `/users/${auth.user.getUsername()}`,
          {
            headers: {
              Authorization: 'Bearer ' + auth.jwtToken,
              'Content-Type': 'application/json',
            },
            body,
          }
        );

        setSnackbarMessage('User profile updated!');
        setIsSuccess(true);
      } catch (err) {
        setSnackbarMessage('Failed to update user profile!');
        setIsSuccess(false);
      } finally {
        setIsUpdating(false);
        setIsSnackbarOpen(true);
      }
    },
  });

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isSnackbarOpen, setIsSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>();
  const [isSuccess, setIsSuccess] = useState<boolean>();
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  useEffect(() => {
    const zipCode = auth.user?.attributes['custom:zipCode'];

    if (zipCode) {
      formik.setFieldValue('zipCode', zipCode);
    }
  }, [auth]);

  const handleClose = (event?: React.SyntheticEvent, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }

    setIsSnackbarOpen(false);
  };

  return (
    <>
      <Portal>
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
      </Portal>

      {auth.user ? (
        <Box display="flex">
          <IconButton
            className={classes.iconButton}
            onClick={() => setIsOpen(true)}
          >
            <AccountCircleIcon fontSize="large" />
          </IconButton>

          <SwipeableDrawer
            anchor="right"
            open={isOpen}
            onOpen={() => setIsOpen(true)}
            onClose={() => setIsOpen(false)}
          >
            <Box className={classes.drawer}>
              <IconButton
                className={classes.closeIcon}
                aria-label="close"
                onClick={() => setIsOpen(false)}
              >
                <CloseIcon />
              </IconButton>

              <List className={classes.list}>
                <Box margin="0 0 1rem">
                  <ListItem>
                    <ListItemIcon>
                      <MailIcon />
                    </ListItemIcon>
                    <ListItemText primary={auth.user.attributes.email} />
                  </ListItem>

                  <ListItem>
                    <ListItemIcon>
                      <GroupIcon />
                    </ListItemIcon>
                    <ListItemText primary={auth.userGroups?.toString()} />
                  </ListItem>
                </Box>

                <Divider />

                {auth.userGroups?.includes('Players') && (
                  <>
                    <Box padding="1rem 1rem">
                      <Typography
                        className={classes.zipCodeHeader}
                        variant="h6"
                        component="h3"
                      >
                        Update User Profile
                      </Typography>

                      <form onSubmit={formik.handleSubmit}>
                        <TextField
                          className={classes.zipCodeInput}
                          variant="outlined"
                          fullWidth
                          margin="normal"
                          id="zipCode"
                          name="zipCode"
                          label="Zip Code*"
                          value={formik.values.zipCode}
                          onChange={formik.handleChange}
                          error={
                            formik.touched.zipCode &&
                            Boolean(formik.errors.zipCode)
                          }
                          helperText={
                            formik.touched.zipCode && formik.errors.zipCode
                          }
                        ></TextField>

                        <Button
                          className={classes.zipCodeButton}
                          type="submit"
                          variant="contained"
                          color="primary"
                          disableElevation
                          fullWidth
                          disabled={isUpdating}
                        >
                          {isUpdating ? (
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

                    <Divider />
                  </>
                )}

                <ListItem>
                  <Button
                    className={classes.signOutButton}
                    variant="contained"
                    disableElevation
                    fullWidth
                    onClick={() => auth.signOut()}
                  >
                    Sign out
                  </Button>
                </ListItem>
              </List>
            </Box>
          </SwipeableDrawer>
        </Box>
      ) : (
        <Button
          variant="contained"
          disableElevation
          onClick={() => auth.signIn()}
        >
          Sign In / Sign Up
        </Button>
      )}
    </>
  );
};

export default AuthButton;
