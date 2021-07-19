import { useLocation } from 'react-router-dom';

export const toTitleCase = (text: string): string => {
  return text ? text[0].toUpperCase() + text?.substring(1) : '';
};

// A custom hook that builds on useLocation to parse
// the query string for you.
export const useQuery = () => {
  return new URLSearchParams(useLocation().search);
};
