import { Box, Button, Divider } from '@material-ui/core';
import { makeStyles } from '@material-ui/styles';
import { useAuth } from './use-auth';

const useStyles = makeStyles({
  divider: {
    margin: '0 1rem 0 0.5rem',
  },
});

const AuthButton = () => {
  const auth = useAuth();

  const classes = useStyles();

  return (
    <>
      {auth.user ? (
        <Box display="flex">
          <Button>{auth.user?.attributes?.email}</Button>
          <Divider
            orientation="vertical"
            flexItem
            className={classes.divider}
          />
          <Button
            variant="contained"
            color="primary"
            disableElevation
            onClick={() => auth.signOut()}
          >
            Sign out
          </Button>
        </Box>
      ) : (
        <Button
          variant="contained"
          color="primary"
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
