import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';
import { Box } from '@material-ui/core';
import { useState } from 'react';
import { getHunts } from '../api/getHunts';
import { ApiNames } from '../api/ApiNames.enum';
import { useAuth } from '../auth/use-auth';
import { useEffect } from 'react';

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
    padding: '2rem',
  },
  table: {
    minWidth: 300,
  },
});

export default function HuntLogs() {
  const auth = useAuth();
  const classes = useStyles();

  const [logs, setLogs] = useState<LogRow[]>([]);

  useEffect(() => {
    const getLogData = async () => {
      setLogs(await getLogs());
    };

    getLogData();
  }, [auth]);

  const getLogs = async () => {
    const hunts = await getHunts(ApiNames.TREASURE_HUNT, '/hunts', {
      headers: {
        Authorization: 'Bearer ' + auth.jwtToken,
        'Content-Type': 'application/json',
      },
    });

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
            {logs.map((row) => (
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
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
