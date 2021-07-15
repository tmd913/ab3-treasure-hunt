import { useParams } from 'react-router-dom';
import { Map } from '../components/Map';

export const Game = () => {
  const { huntID } = useParams<{ huntID: string }>();

  return (
    <>
      <h2>{huntID}</h2>
      <Map></Map>
    </>
  );
};
