export const affiliatesRepositorySymbol = Symbol.for('AffiliatesRepository');

export type AffiliateRecord = {
  id: number;
  code: string;
  walletAddress: string;
  signedMessage: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};

export type CreateAffiliateInput = {
  code: string;
  walletAddress: string;
  signedMessage?: string | null;
  enabled?: boolean;
};

/**
 * Repository for affiliate codes stored in the CMS.
 */
export interface AffiliatesRepository {
  getAffiliateByWalletAddress(params: {
    walletAddress: string;
  }): Promise<AffiliateRecord | null>;

  getAffiliateByCode(params: { code: string }): Promise<AffiliateRecord | null>;

  createAffiliate(params: CreateAffiliateInput): Promise<AffiliateRecord>;
}
