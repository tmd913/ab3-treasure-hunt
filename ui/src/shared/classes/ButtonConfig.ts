import { PropTypes } from '@material-ui/core';

export enum ButtonType {
  LINK,
  FUNCTION,
  CUSTOM,
}

export default abstract class ButtonConfig {
  constructor(
    public type: ButtonType,
    public text: string,
    public color: PropTypes.Color
  ) {}
}
