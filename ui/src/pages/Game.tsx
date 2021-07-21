// import { useParams } from 'react-router-dom';
import {
  Box,
  Button,
  createStyles,
  IconButton,
  Link,
  makeStyles,
  Theme,
} from '@material-ui/core';
import Map from '../components/Map';
import HomeIcon from '@material-ui/icons/Home';
import { Link as RouterLink } from 'react-router-dom';

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    map: {
      width: '100%',
      height: '100vh',
      position: 'absolute',
      top: 0,
    },
    mapButton: {
      backgroundColor: theme.palette.background.paper,
      '&:hover': {
        backgroundColor: theme.palette.grey[200],
      },
    },
    homeButton: {
      minWidth: 40,
      width: 40,
      height: 40,
      borderRadius: '50%',
      position: 'absolute',
      top: 20,
      right: 20,
    },
  })
);

const Game = () => {
  const classes = useStyles();
  // const { huntID } = useParams<{ huntID: string }>();

  return (
    <>
      <Box className={classes.map}>
        <Map></Map>
      </Box>

      <Link component={RouterLink} to="/hunts?type=started">
        <Button
          variant="contained"
          className={classes.mapButton + ' ' + classes.homeButton}
        >
          <HomeIcon />
        </Button>
      </Link>
    </>
  );
};

export default Game;
