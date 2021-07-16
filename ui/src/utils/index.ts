export const toTitleCase = (text: string): string => {
  return text ? text[0].toUpperCase() + text?.substring(1) : '';
};
