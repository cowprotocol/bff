import type { OrderPostError } from '@cowprotocol/cow-sdk';

const isOrderPostError = (e: any): e is OrderPostError => e.errorType && e.description;

export const getErrorMessage = (e: any): string => {
  if (e.body && isOrderPostError(e.body)) {
    return e.body.description;
  }

  return e.message || JSON.stringify(e);
}
