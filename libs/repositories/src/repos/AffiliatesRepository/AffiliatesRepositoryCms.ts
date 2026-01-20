import { getCmsClient } from '../../datasources/cms';
import {
  AffiliateRecord,
  AffiliatesRepository,
  CreateAffiliateInput,
} from './AffiliatesRepository';

const AFFILIATE_COLLECTION_PATH = '/affiliates';

type AffiliateAttributes = {
  code: string;
  walletAddress: string;
  signedMessage?: string | null;
  enabled: boolean;
  rewardAmount: number;
  triggerVolume: number;
  timeCapDays: number;
  volumeCap: number;
  revenueSplitAffiliatePct: number;
  revenueSplitTraderPct: number;
  revenueSplitDaoPct: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
};

type StrapiData<T> = {
  id: number;
  attributes: T;
};

type StrapiListResponse<T> = {
  data: Array<StrapiData<T>>;
  meta?: unknown;
};

type StrapiSingleResponse<T> = {
  data: StrapiData<T>;
};

class CmsRequestError extends Error {
  readonly status: number;
  readonly url: string;
  readonly payload: unknown;

  constructor(params: { status: number; url: string; payload: unknown }) {
    super(`CMS request failed (${params.status})`);
    this.status = params.status;
    this.url = params.url;
    this.payload = params.payload;
  }
}

export class AffiliatesRepositoryCms implements AffiliatesRepository {
  async getAffiliateByWalletAddress(params: {
    walletAddress: string;
  }): Promise<AffiliateRecord | null> {
    const { walletAddress } = params;
    const normalizedWallet = walletAddress.toLowerCase();
    const response = await cmsGet<StrapiListResponse<AffiliateAttributes>>(
      AFFILIATE_COLLECTION_PATH,
      {
        'filters[walletAddress][$eq]': normalizedWallet,
        'pagination[pageSize]': 1,
      }
    );

    return response.data.length > 0 ? mapAffiliate(response.data[0]) : null;
  }

  async getAffiliateByCode(params: {
    code: string;
  }): Promise<AffiliateRecord | null> {
    const { code } = params;
    const normalizedCode = code.trim().toUpperCase();
    const response = await cmsGet<StrapiListResponse<AffiliateAttributes>>(
      AFFILIATE_COLLECTION_PATH,
      {
        'filters[code][$eq]': normalizedCode,
        'pagination[pageSize]': 1,
      }
    );

    return response.data.length > 0 ? mapAffiliate(response.data[0]) : null;
  }

  async createAffiliate(params: CreateAffiliateInput): Promise<AffiliateRecord> {
    const { code, walletAddress, signedMessage, enabled } = params;

    const response = await cmsPost<StrapiSingleResponse<AffiliateAttributes>>(
      AFFILIATE_COLLECTION_PATH,
      {
        data: {
          code,
          walletAddress,
          signedMessage: signedMessage ?? null,
          enabled: enabled ?? true,
        },
      }
    );

    return mapAffiliate(response.data);
  }
}

function mapAffiliate(data: StrapiData<AffiliateAttributes>): AffiliateRecord {
  return {
    id: data.id,
    code: data.attributes.code,
    walletAddress: data.attributes.walletAddress,
    signedMessage: data.attributes.signedMessage ?? null,
    enabled: data.attributes.enabled,
    rewardAmount: data.attributes.rewardAmount,
    triggerVolume: data.attributes.triggerVolume,
    timeCapDays: data.attributes.timeCapDays,
    volumeCap: data.attributes.volumeCap,
    revenueSplitAffiliatePct: data.attributes.revenueSplitAffiliatePct,
    revenueSplitTraderPct: data.attributes.revenueSplitTraderPct,
    revenueSplitDaoPct: data.attributes.revenueSplitDaoPct,
    createdAt: data.attributes.createdAt,
    updatedAt: data.attributes.updatedAt,
    publishedAt: data.attributes.publishedAt ?? null,
  };
}

async function cmsGet<T>(
  path: string,
  query?: Record<string, string | number | boolean>
): Promise<T> {
  const cmsClient = getCmsClient() as any;
  const { data, error, response } = await cmsClient.GET(path, {
    params: query ? { query } : undefined,
  });

  if (error) {
    throw new CmsRequestError({
      status: response.status,
      url: response.url,
      payload: error,
    });
  }

  return data as T;
}

async function cmsPost<T>(path: string, body: unknown): Promise<T> {
  const cmsClient = getCmsClient() as any;
  const { data, error, response } = await cmsClient.POST(path, { body });

  if (error) {
    throw new CmsRequestError({
      status: response.status,
      url: response.url,
      payload: error,
    });
  }

  return data as T;
}

export function isCmsRequestError(error: unknown): error is CmsRequestError {
  return error instanceof CmsRequestError;
}
