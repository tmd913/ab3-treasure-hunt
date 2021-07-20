import { Tabs, Tab, makeStyles } from '@material-ui/core';
import SportsEsportsIcon from '@material-ui/icons/SportsEsports';
import CheckBoxIcon from '@material-ui/icons/CheckBox';
import NotificationsIcon from '@material-ui/icons/Notifications';
import EmojiEventsIcon from '@material-ui/icons/EmojiEvents';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { Theme } from '@material-ui/core/styles';

const useStyles = makeStyles((theme: Theme) => ({
  root: {
    flexGrow: 1,
    backgroundColor: theme.palette.grey[200],
    boxShadow: `
      -3px 0px 5px -1px rgba(0,0,0,0.2),
      -5px 0px 8px 0px rgba(0,0,0,0.14),
      -1px 0px 14px 0px rgba(0,0,0,0.12)
    `,
  },
  tab: {
    paddingBottom: '1rem',
  },
}));

export default function HuntTypeTabs({ tabValue }: { tabValue: number }) {
  const classes = useStyles();
  const history = useHistory();

  const handleChange = (event: React.ChangeEvent<{}>, newValue: number) => {
    switch (newValue) {
      case 0:
        history.push('/hunts?type=started');
        break;
      case 1:
        history.push('/hunts?type=accepted');
        break;
      case 2:
        history.push('/hunts?type=created');
        break;
      case 3:
        history.push('/hunts?type=completed');
        break;
    }
  };

  return (
    <Tabs
      className={classes.root}
      value={tabValue}
      onChange={handleChange}
      variant="fullWidth"
      indicatorColor="primary"
      textColor="primary"
      aria-label="hunt type tabs"
    >
      <Tab
        className={classes.tab}
        icon={<SportsEsportsIcon />}
        label="STARTED"
      />
      <Tab className={classes.tab} icon={<CheckBoxIcon />} label="ACCEPTED" />
      <Tab
        className={classes.tab}
        icon={<NotificationsIcon />}
        label="INVITES"
      />
      <Tab
        className={classes.tab}
        icon={<EmojiEventsIcon />}
        label="TREASURE"
      />
    </Tabs>
  );
}
