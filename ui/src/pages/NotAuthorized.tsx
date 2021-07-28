import { Box, Typography } from '@material-ui/core';

export default function NotAuthorized() {
  return (
    <Box p={2}>
      <Typography variant="h5" component="h2">
        You are not authorized to view this page
      </Typography>
    </Box>
  );
}
