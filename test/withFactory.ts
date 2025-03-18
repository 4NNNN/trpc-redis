import { factory } from './factory';

type FactoryReturn = ReturnType<typeof factory>;

export async function withFactory<T>(
  callback: (factoryInstance: FactoryReturn) => Promise<T>
): Promise<T> {
  const factoryInstance = factory();
  await factoryInstance.ready();

  try {
    return await callback(factoryInstance);
  } finally {
    factoryInstance.close();
  }
}
