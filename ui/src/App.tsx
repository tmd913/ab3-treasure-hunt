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
  Button,
} from '@material-ui/core';
import BugReportIcon from '@material-ui/icons/BugReport';
import { Storage } from 'aws-amplify';

Amplify.configure(amplifyConfig);

Storage.configure();

export const theme = createTheme({
  spacing: 8,
});

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      width: '100%',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      flexGrow: 1,
      backgroundColor: 'rgb(245,253,255)',
      background:
        'linear-gradient(160deg, rgba(245,253,255,1) 0%, rgba(245,253,255,1) 25%, rgba(193,223,255,1) 100%)',
    },
    headerNav: {
      backgroundColor: theme.palette.primary.main,
      boxShadow: theme.shadows[2],
    },
    toolbar: {
      color: 'white',
      padding: '0 0.75rem',
    },
    homeButton: {
      color: 'white',
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
        <Box className={classes.root}>
          {!isGame && (
            <>
              <AppBar className={classes.headerNav} position="sticky">
                <Toolbar className={classes.toolbar}>
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    width="100%"
                  >
                    <Button
                      className={classes.homeButton}
                      component={RouterLink}
                      to="/"
                    >
                      <Typography variant="h5" component="h1">
                        <BugReportIcon
                          style={{
                            fontSize: '1.75rem',
                            verticalAlign: 'top',
                          }}
                        />
                        SGC
                      </Typography>
                    </Button>

                    <AuthButton></AuthButton>
                  </Box>
                </Toolbar>
              </AppBar>
            </>
          )}

          <Box display="flex" flexDirection="column" flexGrow="1" height="100%">
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
        </Box>
      </ProvideAuth>
    </ThemeProvider>
  );
});

export default App;
