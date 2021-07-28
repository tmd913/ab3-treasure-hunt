import {
  Box,
  Button,
  ButtonGroup,
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
import { ErrorMessage, Field, Formik, useFormik } from 'formik';
import { ApiNames } from '../api/ApiNames.enum';
import { useAuth } from '../auth/use-auth';
import { createUser } from '../api/createUser';
import ToggleButton from '@material-ui/lab/ToggleButton';
import { ToggleButtonGroup } from 'formik-material-ui-lab';
import { Link as RouterLink } from 'react-router-dom';
import ArrowBackIcon from '@material-ui/icons/ArrowBack';
import { Alert } from '@material-ui/lab';
import { useState } from 'react';

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    title: { textAlign: 'center', margin: '0.75rem 0' },
    submitButton: {
      marginTop: '2rem',
    },
    toggleButtonGroup: {
      marginTop: '1rem',
      width: '100%',
    },
    toggleButton: {
      width: '50%',
      color: `${theme.palette.text.secondary} !important`,
      borderColor: theme.palette.grey[400],
    },
    toggleButtonError: {
      border: '1px solid #f44336',
    },
    errorMessage: {
      color: '#f44336',
      marginLeft: 14,
      marginRight: 14,
      fontSize: '0.75rem',
      marginTop: 3,
      lineHeight: 1.66,
      letterSpacing: '0.03333em',
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
    formInput: {
      background: theme.palette.background.paper,
      borderRadius: 4,
    },
  })
);

interface FormValues {
  userEmail: string;
  group: string;
}

const validationSchema = yup.object({
  userEmail: yup
    .string()
    .email('Enter a valid email')
    .required('User email is required'),
  group: yup.string().required('Group is required'),
});

export default function CreateUser() {
  const auth = useAuth();
  const classes = useStyles();

  const [isSnackbarOpen, setIsSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>();
  const [isSuccess, setIsSuccess] = useState<boolean>();
  const [isCreatingUser, setIsCreatingUser] = useState<boolean>(false);

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
        Create User
      </Typography>

      <Box display="flex" justifyContent="center" padding="0 1rem" width="100%">
        <Box width="40%" minWidth={300} maxWidth={500}>
          <Formik
            initialValues={{
              userEmail: '',
              group: '',
            }}
            validationSchema={validationSchema}
            onSubmit={async (values, actions) => {
              const body = {
                userEmail: values.userEmail,
                group: values.group,
              };

              setIsCreatingUser(true);

              try {
                await createUser(ApiNames.TREASURE_HUNT, '/users', {
                  headers: {
                    Authorization: 'Bearer ' + auth.jwtToken,
                    'Content-Type': 'application/json',
                  },
                  body,
                });

                setSnackbarMessage('User created!');
                setIsSuccess(true);
              } catch (err) {
                setSnackbarMessage('Failed to create user!');
                setIsSuccess(false);
              } finally {
                setIsCreatingUser(false);
                setIsSnackbarOpen(true);
              }
            }}
          >
            {(props) => (
              <form onSubmit={props.handleSubmit}>
                <TextField
                  className={classes.formInput}
                  variant="outlined"
                  fullWidth
                  margin="normal"
                  id="userEmail"
                  name="userEmail"
                  label="User Email*"
                  value={props.values.userEmail}
                  onChange={props.handleChange}
                  error={
                    props.touched.userEmail && Boolean(props.errors.userEmail)
                  }
                  helperText={props.touched.userEmail && props.errors.userEmail}
                ></TextField>

                <Field
                  component={ToggleButtonGroup}
                  id="group"
                  name="group"
                  type="checkbox"
                  className={
                    classes.toggleButtonGroup + ' ' + classes.formInput
                  }
                  value={props.values.group}
                  exclusive
                  onChange={(e: any, group: string) => {
                    if (group !== null) {
                      props.setFieldValue('group', group);
                    }
                  }}
                  aria-label="outlined primary button group"
                >
                  <ToggleButton
                    className={`${classes.toggleButton}${
                      props.touched.group && Boolean(props.errors.group)
                        ? ' ' + classes.toggleButtonError
                        : ''
                    }`}
                    name="group"
                    value="Admins"
                  >
                    Admins
                  </ToggleButton>
                  <ToggleButton
                    className={`${classes.toggleButton}${
                      props.touched.group && Boolean(props.errors.group)
                        ? ' ' + classes.toggleButtonError
                        : ''
                    }`}
                    name="group"
                    value="Devs"
                  >
                    Devs
                  </ToggleButton>
                </Field>
                <ErrorMessage
                  className={classes.errorMessage}
                  component="div"
                  name="group"
                />

                <Button
                  className={classes.submitButton}
                  color="primary"
                  variant="contained"
                  fullWidth
                  type="submit"
                  disabled={isCreatingUser}
                >
                  {isCreatingUser ? (
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
            )}
          </Formik>
        </Box>
      </Box>
    </Box>
  );
}
