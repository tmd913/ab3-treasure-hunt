export enum ButtonType {
  LINK,
  FUNCTION,
}

export default abstract class HuntInfo {
  constructor(
    public title: string,
    public timestampText: string,
    public timestampField: string,
    public buttonType: ButtonType,
    public buttonText: string
  ) {}
}
