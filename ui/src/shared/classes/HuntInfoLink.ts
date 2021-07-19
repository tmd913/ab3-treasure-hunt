import HuntInfo, { ButtonType } from './HuntInfo';

export interface LinkConfig {
  pathParams?: {
    [key: string]: string;
  };
  queryParams?: {
    [key: string]: string;
  };
}

export default class HuntInfoLink extends HuntInfo {
  constructor(
    title: string,
    timestampText: string,
    timestampField: string,
    buttonText: string,
    public url: string,
    public onClickHandler?: Function
  ) {
    super(title, timestampText, timestampField, ButtonType.LINK, buttonText);
  }

  createURL({ pathParams, queryParams }: LinkConfig): string {
    let url = this.url;

    for (const [key, value] of Object.entries(pathParams || {})) {
      url = url.replace(':' + key, value);
    }

    return url + '?' + new URLSearchParams(queryParams);
  }
}
