import HuntInfoLink from './HuntInfoLink';

test('create link', () => {
  expect(
    new HuntInfoLink('', '', '', '', '/games/:game').createURL({
      pathParams: {
        game: 'hunt123',
      },
      queryParams: {
        type: 'test',
        order: 'asc',
      },
    })
  ).toEqual('/games/hunt123?type=test&order=asc');
});

export {};
