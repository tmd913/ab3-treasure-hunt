import { Button } from '@material-ui/core';
import { PropsWithChildren } from 'react';

export default function FunctionButton({
  huntID,
  text,
  onClickHandler,
}: PropsWithChildren<{
  huntID: string;
  text: string;
  onClickHandler: Function;
}>) {
  return (
    <Button
      variant="contained"
      color="primary"
      disableElevation
      onClick={() => onClickHandler(huntID)}
    >
      {text}
    </Button>
  );
}
