import ButtonConfig from './ButtonConfig';

export default class HuntCardConfig {
  constructor(
    public title: string,
    public timestampText: string,
    public timestampField: string,
    public buttonConfigs: ButtonConfig[]
  ) {}
}
