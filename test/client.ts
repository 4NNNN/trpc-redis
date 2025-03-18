import { withFactory } from './withFactory';

withFactory(async ({ client }) => {
  const result = await client.greet.query('world');
  console.log('Greet result:', result.greeting);

  const count1 = await client.countUp.mutate(1);
  console.log('Count after +1:', count1);

  const count2 = await client.countUp.mutate(2);
  console.log('Count after +2:', count2);

  const context = await client.getContext.query();
  console.log('Context:', context);
});
