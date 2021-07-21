import './App.css';
import Amplify from 'aws-amplify';
import amplifyConfig from './amplify-config';
import {
  Switch,
  Route,
  Link as RouterLink,
  useRouteMatch,
  withRouter,
} from 'react-router-dom';
import AuthButton from './auth/AuthButton';
import Home from './pages/Home';
import { ProvideAuth } from './auth/use-auth';
import PrivateRoute from './routes/PrivateRoute';
import PlayerHunts from './pages/PlayerHunts';
import Game from './pages/Game';
import CreateHunt from './pages/CreateHunt';
import CreateUser from './pages/CreateUser';
import HuntLogs from './pages/HuntLogs';
import NotFound from './pages/NotFound';
import {
  AppBar,
  Box,
  createStyles,
  unstable_createMuiStrictModeTheme as createTheme,
  CssBaseline,
  Link,
  makeStyles,
  Theme,
  ThemeProvider,
  Toolbar,
  Typography,
} from '@material-ui/core';

Amplify.configure(amplifyConfig);

export const theme = createTheme({
  spacing: 8,
});

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      '& > * + *': {
        marginLeft: theme.spacing(2),
      },
    },
    headerNav: {
      backgroundColor: theme.palette.grey[200],
      boxShadow: theme.shadows[2],
    },
  })
);

const App = withRouter(() => {
  const classes = useStyles();
  const isGame = useRouteMatch('/games/:huntID');

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ProvideAuth>
        {!isGame && (
          <>
            <AppBar className={classes.headerNav} position="sticky">
              <Toolbar>
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  width="100%"
                >
                  <Typography variant="h5" component="h1" color="textPrimary">
                    SGC
                  </Typography>

                  <Typography className={classes.root}>
                    <Link component={RouterLink} to="/">
                      Home
                    </Link>

                    <Link component={RouterLink} to="/hunts?type=started">
                      Player Hunts
                    </Link>

                    <Link component={RouterLink} to="/logs">
                      Hunt Logs
                    </Link>

                    <Link component={RouterLink} to="/createHunt">
                      Create Hunt
                    </Link>

                    <Link component={RouterLink} to="/createUser">
                      Create User
                    </Link>
                  </Typography>

                  <AuthButton></AuthButton>
                </Box>
              </Toolbar>
            </AppBar>
          </>
        )}

        <Box>
          <Switch>
            <Route exact path="/">
              <Home />
            </Route>
            <PrivateRoute path="/hunts" allowedGroups={['Players']}>
              <PlayerHunts />
            </PrivateRoute>
            <PrivateRoute path="/games/:huntID" allowedGroups={['Players']}>
              <Game />
            </PrivateRoute>
            <PrivateRoute path="/logs" allowedGroups={['Admins', 'Devs']}>
              <HuntLogs />
            </PrivateRoute>
            <PrivateRoute path="/createHunt" allowedGroups={['Admins']}>
              <CreateHunt />
            </PrivateRoute>
            <PrivateRoute path="/createUser" allowedGroups={['Admins']}>
              <CreateUser />
            </PrivateRoute>
            <Route path="*">
              <NotFound />
            </Route>
          </Switch>
        </Box>
      </ProvideAuth>
    </ThemeProvider>
  );
});

export default App;
