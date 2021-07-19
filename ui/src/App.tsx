import './App.css';
import Amplify from 'aws-amplify';
import amplifyConfig from './amplify-config';
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Link as RouterLink,
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
  Box,
  createStyles,
  createTheme,
  CssBaseline,
  Link,
  makeStyles,
  Theme,
  ThemeProvider,
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
  })
);

const App = () => {
  const classes = useStyles();

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ProvideAuth>
        <Router>
          <Box p={2}>
            <AuthButton></AuthButton>
          </Box>

          <Box>
            <Box p={2}>
              <Typography className={classes.root}>
                <Link component={RouterLink} to="/">
                  Home
                </Link>
                <Link component={RouterLink} to="/hunts?type=started">
                  Player Hunts
                </Link>
                <Link component={RouterLink} to="/games/hunt123">
                  Game
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
            </Box>

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
        </Router>
      </ProvideAuth>
    </ThemeProvider>
  );
};

export default App;
