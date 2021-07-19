import { Button } from '@material-ui/core';
import { PropsWithChildren } from 'react';
import { Link, useHistory } from 'react-router-dom';

export default function LinkButton({
  huntID,
  text,
  link,
  onClickHandler,
}: PropsWithChildren<{
  huntID: string;
  text: string;
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
        color="primary"
        disableElevation
        onClick={() => handleClick(huntID)}
      >
        {text}
      </Button>
    </>
  );
}
