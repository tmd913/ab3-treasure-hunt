import { Button, PropTypes } from '@material-ui/core';
import { PropsWithChildren } from 'react';
import { useHistory } from 'react-router-dom';

export default function LinkButton({
  huntID,
  text,
  color,
  link,
  onClickHandler,
}: PropsWithChildren<{
  huntID: string;
  text: string;
  color: PropTypes.Color;
  link: string;
  onClickHandler?: Function;
}>) {
  const history = useHistory();

  const handleClick = (huntID: string) => {
    if (onClickHandler) {
      onClickHandler(huntID);
    }

    history.push(link);
  };

  return (
    <>
      <Button
        variant="contained"
        color={color}
        disableElevation
        onClick={() => handleClick(huntID)}
      >
        {text}
      </Button>
    </>
  );
}
