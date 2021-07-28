import { PropTypes } from '@material-ui/core';
import { ReactElement } from 'react';
import ButtonConfig, { ButtonType } from './ButtonConfig';

export default class CustomButtonConfig extends ButtonConfig {
  constructor(
    text: string,
    color: PropTypes.Color,
    public onClickHandler: Function,
    public createCustomButton: (
      isLoading: boolean
    ) => (
      huntID: string,
      key: string,
      buttonConfig: CustomButtonConfig
    ) => ReactElement<any>
  ) {
    super(ButtonType.CUSTOM, text, color);
  }
}
