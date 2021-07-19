import {
  Box,
  Card,
  CardActions,
  CardContent,
  makeStyles,
  Typography,
} from '@material-ui/core';
import { PropsWithChildren } from 'react';

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
  timestampText,
  timestampField,
}: PropsWithChildren<{
  hunt: any;
  timestampText: string;
  timestampField: string;
}>) {
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
            {timestampText}:
          </Typography>
          <Typography component="h2">
            {new Date(hunt[timestampField]).toLocaleString()}
          </Typography>
        </CardContent>
        <CardActions>{children}</CardActions>
      </Box>
    </Card>
  );
}
