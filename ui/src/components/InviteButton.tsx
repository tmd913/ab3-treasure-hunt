import { Button, CircularProgress } from '@material-ui/core';
import { useState } from 'react';
import InviteButtonConfig from '../shared/classes/InviteButtonConfig';
import { HuntType } from '../shared/enums/HuntType';

export default function InviteButton({
  huntID,
  buttonConfig,
  updateHunt,
  updateType,
  filterHunts,
}: {
  huntID: string;
  buttonConfig: InviteButtonConfig;
  updateHunt: Function;
  updateType: HuntType;
  filterHunts: Function;
}) {
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleClick = async (huntID: string) => {
    setIsLoading(true);
    const success = await updateHunt(huntID, updateType);
    setIsLoading(false);
    if (success) {
      filterHunts(huntID);
    }
  };

  const createCustomButton = (
    huntID: string,
    buttonConfig: InviteButtonConfig
  ) => (
    <Button
      variant="contained"
      disableElevation
      color={buttonConfig.color}
      onClick={() => {
        handleClick(huntID);
      }}
      style={{ width: 82 }}
      type="submit"
      disabled={isLoading}
    >
      {isLoading ? (
        <CircularProgress
          style={{
            width: 24.5,
            height: 24.5,
          }}
        />
      ) : (
        buttonConfig.text
      )}
    </Button>
  );

  return createCustomButton(huntID, buttonConfig);
}
