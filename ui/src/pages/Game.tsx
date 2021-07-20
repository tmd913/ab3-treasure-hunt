// import { useParams } from 'react-router-dom';
import {
  Button,
  createStyles,
  IconButton,
  makeStyles,
  Theme,
} from '@material-ui/core';
import Map from '../components/Map';
import HomeIcon from '@material-ui/icons/Home';

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    homeButton: {
      minWidth: 40,
      width: 40,
      height: 40,
      borderRadius: '50%',
      backgroundColor: theme.palette.background.paper,
      position: 'absolute',
      top: 20,
      right: 20,
      '&:hover': {
        backgroundColor: theme.palette.grey[200],
      },
    },
  })
);

const Game = () => {
  const classes = useStyles();
  // const { huntID } = useParams<{ huntID: string }>();

  return (
    <>
      <Map></Map>
    </>
  );
};

export default Game;
