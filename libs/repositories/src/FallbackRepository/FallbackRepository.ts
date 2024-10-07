import { injectable } from 'inversify';

@injectable()
export class FallbackRepository<T extends object> {
  private static createProxy<T extends object>(instances: T[]): T {
    return new Proxy<T>({} as T, {
      get: (target, prop: string | symbol) => {
        return async (...args: any[]) => {
          for (const instance of instances) {
            const method = (instance as any)[prop];
            if (typeof method === 'function') {
              try {
                const result = await method.apply(instance, args);
                if (result !== null) {
                  return result;
                }
              } catch (error) {
                console.error(`Error in ${String(prop)}:`, error);
                // Continue to the next instance
              }
            }
          }
          return null;
        };
      },
    });
  }

  static create<T extends object>(instances: T[]): T {
    return FallbackRepository.createProxy(instances);
  }
}
