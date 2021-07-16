import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  makeStyles,
  Typography,
} from '@material-ui/core';
import { PropsWithChildren } from 'react';
import { Link } from 'react-router-dom';
import { toTitleCase } from '../utils';

const useStyles = makeStyles({
  root: {
    minWidth: 275,
  },
  title: {
    fontSize: 14,
  },
});

export default function Hunt({
  children,
  hunt,
  type,
}: PropsWithChildren<{ hunt: any; type: string }>) {
  const classes = useStyles();

  return (
    <Card className={classes.root}>
      <Box
        display="flex"
        justifyContent="space-between"
        width="100%"
        padding="0 1rem 0 0.5rem"
      >
        <CardContent>
          <Typography className={classes.title} color="textSecondary">
            {toTitleCase(type)} hunt at:
          </Typography>
          <Typography component="h2">
            {new Date(hunt?.CreatedAt).toLocaleString()}
          </Typography>
        </CardContent>
        <CardActions>
          <Link to={`/games/${hunt?.HuntID}`}>
            <Button variant="contained" color="primary" disableElevation>
              Start Hunt
            </Button>
          </Link>
        </CardActions>
      </Box>
    </Card>
  );
}
