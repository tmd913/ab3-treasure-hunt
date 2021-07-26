import {
  Box,
  Button,
  ButtonGroup,
  createStyles,
  Link,
  TextField,
  Theme,
  Typography,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/styles';
import * as yup from 'yup';
import { ErrorMessage, Field, Formik, useFormik } from 'formik';
import { ApiNames } from '../api/ApiNames.enum';
import { useAuth } from '../auth/use-auth';
import { CognitoIdentityServiceProvider } from 'aws-sdk';
import { createUser } from '../api/createUser';
import ToggleButton from '@material-ui/lab/ToggleButton';
import { ToggleButtonGroup } from 'formik-material-ui-lab';
import { Link as RouterLink, useParams } from 'react-router-dom';
import ArrowBackIcon from '@material-ui/icons/ArrowBack';

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    title: { textAlign: 'center', margin: '1rem 0' },
    submitButton: {
      marginTop: '2rem',
    },
    toggleButtonGroup: {
      marginTop: '1rem',
      width: '100%',
    },
    toggleButton: {
      width: '50%',
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

  return (
    <Box p={2} position="relative">
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

              await createUser(ApiNames.TREASURE_HUNT, '/users', {
                headers: {
                  Authorization: 'Bearer ' + auth.jwtToken,
                  'Content-Type': 'application/json',
                },
                body,
              });

              actions.resetForm();
            }}
          >
            {(props) => (
              <form onSubmit={props.handleSubmit}>
                <TextField
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
                  className={classes.toggleButtonGroup}
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
                      props.errors.group ? ' ' + classes.toggleButtonError : ''
                    }`}
                    name="group"
                    value="Admins"
                  >
                    Admins
                  </ToggleButton>
                  <ToggleButton
                    className={`${classes.toggleButton}${
                      props.errors.group ? ' ' + classes.toggleButtonError : ''
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
                >
                  Submit
                </Button>
              </form>
            )}
          </Formik>
        </Box>
      </Box>
    </Box>
  );
}
