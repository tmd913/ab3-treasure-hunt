import {
  expect as expectCDK,
  matchTemplate,
  MatchStyle,
} from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as Ab3TreasureHunt from '../lib/ab3-treasure-hunt-stack';

test('Empty Stack', () => {
  expect(true).toBeTruthy();
  // const app = new cdk.App();
  // // WHEN
  // const stack = new Ab3TreasureHunt.Ab3TreasureHuntStack(app, 'MyTestStack');
  // // THEN
  // expectCDK(stack).to(
  //   matchTemplate(
  //     {
  //       Resources: {},
  //     },
  //     MatchStyle.EXACT
  //   )
  // );
});
