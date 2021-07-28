import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';
import { Box, Button, CircularProgress, Typography } from '@material-ui/core';
import { useState } from 'react';
import { getHunts } from '../api/getHunts';
import { ApiNames } from '../api/ApiNames.enum';
import { useAuth } from '../auth/use-auth';
import { useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';

interface LogRow {
  lastModifiedAt: string;
  createdAt: string;
  createdBy: string;
  huntType: string;
  huntID: string;
  playerID: string;
  playerEmail: string;
  treasureDescription: string;
}

interface HuntInfo {
  HuntTypeTime: string;
  TriggerDistance: number;
  PlayerEmail: string;
  HuntID: string;
  TreasureDescription: string;
  CreatedYear: number;
  TreasureImage: string;
  TreasureLocation: {
    latitude: number;
    longitude: number;
  };
  CreatedBy: string;
  CreatedAt: string;
  HuntType: string;
  PlayerID: string;
}

const useStyles = makeStyles({
  container: {
    padding: '1.5rem 2rem',
  },
  table: {
    minWidth: 300,
  },
  createHuntButton: {
    marginRight: '1rem',
  },
});

export default function HuntLogs() {
  const auth = useAuth();
  const classes = useStyles();

  const [logs, setLogs] = useState<LogRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    const getLogData = async () => {
      setLogs(await getLogs());
    };

    getLogData();
  }, [auth]);

  const getLogs = async () => {
    setIsLoading(true);

    const hunts = await getHunts(ApiNames.TREASURE_HUNT, '/hunts', {
      headers: {
        Authorization: 'Bearer ' + auth.jwtToken,
        'Content-Type': 'application/json',
      },
    });

    setIsLoading(false);

    const items: HuntInfo[] = hunts.items;

    return items.map((hunt) => ({
      lastModifiedAt: hunt.HuntTypeTime.split('#')[1],
      createdAt: hunt.CreatedAt,
      createdBy: hunt.CreatedBy,
      huntType: hunt.HuntTypeTime.split('#')[0],
      huntID: hunt.HuntID,
      playerID: hunt.PlayerID,
      playerEmail: hunt.PlayerEmail,
      treasureDescription: hunt.TreasureDescription,
    }));
  };

  return (
    <Box className={classes.container}>
      <Box
        display="flex"
        flexWrap="wrap"
        justifyContent="space-between"
        alignItems="end"
        marginBottom="1rem"
      >
        <Box paddingLeft="1rem">
          <Typography variant="h5" component="h2">
            Hunt Logs
          </Typography>
        </Box>

        {auth?.userGroups?.includes('Admins') && (
          <Box marginTop="0.25rem">
            <Button
              className={classes.createHuntButton}
              variant="contained"
              color="primary"
              component={RouterLink}
              to="/createHunt"
            >
              Create Hunt
            </Button>

            <Button variant="contained" component={RouterLink} to="/createUser">
              Create User
            </Button>
          </Box>
        )}
      </Box>

      <TableContainer component={Paper}>
        <Table className={classes.table} aria-label="hunt logs table">
          <TableHead>
            <TableRow>
              <TableCell>Last Modified At</TableCell>
              <TableCell>Created At</TableCell>
              <TableCell>Created By</TableCell>
              <TableCell>Hunt Type</TableCell>
              <TableCell>Hunt ID</TableCell>
              <TableCell>Player ID</TableCell>
              <TableCell>Player Email</TableCell>
              <TableCell>Treasure Description</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <Box width="100%" height={40} margin={1} textAlign="center">
                    <CircularProgress />
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              logs.map((row) => (
                <TableRow key={row.huntID}>
                  <TableCell component="th" scope="row">
                    {row.lastModifiedAt}
                  </TableCell>
                  <TableCell>{row.createdAt}</TableCell>
                  <TableCell>{row.createdBy}</TableCell>
                  <TableCell>{row.huntType}</TableCell>
                  <TableCell>{row.huntID}</TableCell>
                  <TableCell>{row.playerID}</TableCell>
                  <TableCell>{row.playerEmail}</TableCell>
                  <TableCell>{row.treasureDescription}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
