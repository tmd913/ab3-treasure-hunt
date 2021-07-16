import { calculateDistance } from '.';
import { Location } from '../shared/interfaces';

test('distance between points', () => {
  const playerLocation: Location = {
    latitude: 50,
    longitude: 100,
  };
  const treasureLocation: Location = {
    latitude: 50.01,
    longitude: 100.01,
  };

  expect(calculateDistance(playerLocation, treasureLocation)).toEqual(1322);
});
