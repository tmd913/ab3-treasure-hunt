import {
  Box,
  Typography,
  createStyles,
  makeStyles,
  Theme,
  IconButton,
  SwipeableDrawer,
} from '@material-ui/core';
import { useEffect } from 'react';
import Skeleton from '@material-ui/lab/Skeleton';
import CloseIcon from '@material-ui/icons/Close';

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    treasureDrawer: {
      height: '100%',
      width: '100vw',
      maxWidth: 600,
      textAlign: 'center',
      backgroundColor: 'rgb(252,246,186)',
      background:
        'linear-gradient(150deg, rgba(252,246,186,1) 0%, rgba(252,246,186,1) 5%, rgba(170,119,28,1) 100%)',
    },
    treasureTitle: {
      marginTop: '0.5rem',
    },
    treasureImage: {
      fontSize: '8rem',
    },
    imageContainer: {
      display: 'flex',
      justifyContent: 'center',
      margin: '1.5rem',
    },
    imageWrapper: {
      borderRadius: 4,
      width: 200,
      height: 200,
      boxSizing: 'content-box',
      padding: '1rem',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: theme.palette.background.paper,
      boxShadow: theme.shadows[4],
    },
    image: {
      maxWidth: 200,
      maxHeight: 200,
    },
    skeleton: {
      borderRadius: 4,
      width: 200,
      height: 200,
      boxSizing: 'content-box',
      padding: '1rem',
    },
    treasureDescriptionContainer: {
      display: 'flex',
      justifyContent: 'center',
    },
    treasureDescription: {
      width: '100%',
      maxWidth: 450,
      boxSizing: 'content-box',
      marginTop: '1rem',
      padding: '1rem',
      borderRadius: 4,
      background: theme.palette.background.paper,
      boxShadow: theme.shadows[4],
    },
    closeIcon: {
      position: 'absolute',
      right: 0,
      top: 0,
    },
  })
);

export default function TreasureDrawer({
  isTreasureLoading,
  isTreasureOpen,
  treasureImage,
  treasureDescription,
  handleTreasureStateChange,
}: {
  isTreasureLoading: boolean;
  isTreasureOpen: boolean;
  treasureImage?: string | Object;
  treasureDescription?: string;
  handleTreasureStateChange: (isOpen: boolean) => void;
}) {
  const classes = useStyles();

  useEffect(() => {
    toggleDrawer(isTreasureOpen);
  }, [isTreasureOpen]);

  const toggleDrawer = (
    isOpen: boolean,
    event?: React.KeyboardEvent | React.MouseEvent
  ) => {
    if (
      event?.type === 'keydown' &&
      ((event as React.KeyboardEvent).key === 'Tab' ||
        (event as React.KeyboardEvent).key === 'Shift')
    ) {
      return;
    }

    handleTreasureStateChange(isOpen);
  };

  return (
    <SwipeableDrawer
      anchor="right"
      open={isTreasureOpen}
      onOpen={(event: React.KeyboardEvent | React.MouseEvent) =>
        toggleDrawer(true, event)
      }
      onClose={(event: React.KeyboardEvent | React.MouseEvent) =>
        toggleDrawer(false, event)
      }
    >
      <Box p={2} className={classes.treasureDrawer}>
        <IconButton
          className={classes.closeIcon}
          aria-label="close"
          onClick={() => toggleDrawer(false)}
        >
          <CloseIcon />
        </IconButton>

        <Typography className={classes.treasureTitle} variant="h5">
          Treasure Details
        </Typography>

        <Box className={classes.imageContainer}>
          {isTreasureLoading ? (
            <Skeleton className={classes.skeleton} variant="rect" />
          ) : (
            treasureImage && (
              <Box className={classes.imageWrapper}>
                <img src={treasureImage.toString()} className={classes.image} />
              </Box>
            )
          )}
        </Box>

        <Box className={classes.treasureDescriptionContainer}>
          <Typography className={classes.treasureDescription}>
            {treasureDescription}
          </Typography>
        </Box>
      </Box>
    </SwipeableDrawer>
  );
}
