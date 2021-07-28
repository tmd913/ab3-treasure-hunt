import { PropTypes } from '@material-ui/core';
import { HuntType } from '../enums/HuntType';
import ButtonConfig, { ButtonType } from './ButtonConfig';

export default class InviteButtonConfig extends ButtonConfig {
  constructor(
    text: string,
    color: PropTypes.Color,
    public updateType: HuntType
  ) {
    super(ButtonType.INVITE, text, color);
  }
}
