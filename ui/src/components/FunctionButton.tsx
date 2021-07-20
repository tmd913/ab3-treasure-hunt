import { Button, PropTypes } from '@material-ui/core';
import { PropsWithChildren } from 'react';

export default function FunctionButton({
  huntID,
  text,
  color,
  onClickHandler,
}: PropsWithChildren<{
  huntID: string;
  text: string;
  color: PropTypes.Color;
  onClickHandler: Function;
}>) {
  return (
    <Button
      variant="contained"
      color={color}
      disableElevation
      onClick={() => onClickHandler(huntID)}
    >
      {text}
    </Button>
  );
}
