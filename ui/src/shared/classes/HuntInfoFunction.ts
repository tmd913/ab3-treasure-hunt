import HuntInfo, { ButtonType } from './HuntInfo';

export default class HuntInfoFunction extends HuntInfo {
  constructor(
    title: string,
    timestampText: string,
    timestampField: string,
    buttonText: string,
    public onClickHandler: Function
  ) {
    super(
      title,
      timestampText,
      timestampField,
      ButtonType.FUNCTION,
      buttonText
    );
  }
}
