import { PropTypes } from '@material-ui/core';
import ButtonConfig, { ButtonType } from './ButtonConfig';

export interface LinkConfig {
  pathParams?: {
    [key: string]: string;
  };
  queryParams?: {
    [key: string]: string;
  };
}

export default class LinkButtonConfig extends ButtonConfig {
  constructor(
    text: string,
    color: PropTypes.Color,
    public url: string,
    public onClickHandler?: Function
  ) {
    super(ButtonType.LINK, text, color);
  }

  createURL({ pathParams, queryParams }: LinkConfig): string {
    let url = this.url;

    for (const [key, value] of Object.entries(pathParams || {})) {
      url = url.replace(':' + key, value);
    }

    return url + '?' + new URLSearchParams(queryParams);
  }
}
