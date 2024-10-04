import { SupportedChainId } from '@cowprotocol/shared';

export interface TokenHolderPoint {
  address: string;
  balance: string;
}

export interface TokenHolderRepository {
  getTopTokenHolders(
    chainId: SupportedChainId,
    tokenAddress: string
  ): Promise<TokenHolderPoint[] | null>;
}

export class TokenHolderRepositoryNoop implements TokenHolderRepository {
  async getTopTokenHolders(
    chainId: SupportedChainId,
    tokenAddress: string
  ): Promise<TokenHolderPoint[] | null> {
    return null;
  }
}

// export const serializePricePoints = (pricePoints: PricePoint[]): string => {
//   const serialized = pricePoints.map((point) => ({
//     ...point,
//     date: point.date.toISOString(),
//   }));
//   return JSON.stringify(serialized);
// };

// export type PricePointSerializable = Omit<PricePoint, 'date'> & {
//   date: string;
// };

// export const deserializePricePoints = (
//   serializedPricePoints: string
// ): PricePoint[] => {
//   const parsed: PricePointSerializable[] = JSON.parse(serializedPricePoints);
//   return parsed.map((point) => ({
//     ...point,
//     date: new Date(point.date),
//   }));
// };
