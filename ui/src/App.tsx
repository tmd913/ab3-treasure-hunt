import './App.css';
import Amplify from 'aws-amplify';
import amplifyConfig from './amplify-config';
import { BrowserRouter as Router, Switch, Route, Link } from 'react-router-dom';
import { AuthButton } from './auth/AuthButton';
import { Home } from './pages/Home';
import { ProvideAuth } from './auth/use-auth';
import { PrivateRoute } from './routes/PrivateRoute';
import { PlayerHunts } from './pages/PlayerHunts';
import { Game } from './pages/Game';
import { CreateHunt } from './pages/CreateHunt';
import { CreateUser } from './pages/CreateUser';
import { HuntLogs } from './pages/HuntLogs';
import { NotAuthorized } from './pages/NotAuthorized';
import { NotFound } from './pages/NotFound';

Amplify.configure(amplifyConfig);

const App = () => {
  return (
    <ProvideAuth>
      <Router>
        <AuthButton></AuthButton>
        <div>
          <ul>
            <li>
              <Link to="/">Home</Link>
            </li>
            <li>
              <Link to="/hunts">Player Hunts</Link>
            </li>
            <li>
              <Link to="/games/hunt123">Game</Link>
            </li>
            <li>
              <Link to="/logs">Hunt Logs</Link>
            </li>
            <li>
              <Link to="/createHunt">Create Hunt</Link>
            </li>
            <li>
              <Link to="/createUser">Create User</Link>
            </li>
          </ul>

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
        </div>
      </Router>
    </ProvideAuth>
  );
};

export default App;
