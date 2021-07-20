import { PropTypes } from '@material-ui/core';
import ButtonConfig, { ButtonType } from './ButtonConfig';

export default class FunctionButtonConfig extends ButtonConfig {
  constructor(
    text: string,
    color: PropTypes.Color,
    public onClickHandler: Function
  ) {
    super(ButtonType.FUNCTION, text, color);
  }
}
