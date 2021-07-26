import {
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
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

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    list: {
      width: '75vw',
      maxWidth: 400,
      padding: '0.5rem 1rem',
    },
    iconButton: {
      color: 'white',
      '&:hover': {
        background: 'rgba(255, 255, 255, 0.3)',
      },
    },
    zipCodeHeader: {
      margin: '0 0 1rem',
      textAlign: 'center',
    },
    zipCodeInput: {
      margin: '0 0 1rem',
    },
    zipCodeButton: {
      marginBottom: '0.5rem',
    },
    signOutButton: {
      marginTop: '1rem',
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

      // await updateUser(
      //   ApiNames.TREASURE_HUNT,
      //   `/users/${auth.user.getUsername()}`,
      //   {
      //     headers: {
      //       Authorization: 'Bearer ' + auth.jwtToken,
      //       'Content-Type': 'application/json',
      //     },
      //     body,
      //   }
      // );
    },
  });

  const [isOpen, setIsOpen] = useState<boolean>(false);

  useEffect(() => {
    const zipCode = auth.user?.attributes.zipCode || '20037';

    if (zipCode) {
      formik.setFieldValue('zipCode', zipCode);
    }
  }, [auth]);

  return (
    <>
      {auth.user ? (
        <Box display="flex">
          <IconButton
            className={classes.iconButton}
            onClick={() => setIsOpen(true)}
          >
            <AccountCircleIcon fontSize="large" />
          </IconButton>
          <Drawer anchor="right" open={isOpen} onClose={() => setIsOpen(false)}>
            <List className={classes.list}>
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
                      >
                        Submit
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
          </Drawer>
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
