import LinkButtonConfig from './LinkButtonConfig';

test('create link button info', () => {
  expect(
    new LinkButtonConfig('', 'primary', '/games/:game').createURL({
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
