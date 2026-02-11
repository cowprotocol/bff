import { FastifyPluginAsync, FastifyReply } from 'fastify';
import { FromSchema } from 'json-schema-to-ts';
import {
  AffiliatesRepository,
  affiliatesRepositorySymbol,
  getViemClients,
  isCmsEnabled,
  isCmsRequestError,
  isDuneEnabled,
} from '@cowprotocol/repositories';
import { SupportedChainId } from '@cowprotocol/cow-sdk';
import { apiContainer } from '../../../inversify.config';
import { logger } from '@cowprotocol/shared';
import {
  AffiliateProgramExportService,
  affiliateProgramExportServiceSymbol,
} from '@cowprotocol/services';
import { AFFILIATE_CODE_REGEX } from '../../../config/affiliate';
import {
  affiliateCreateResponseSchema,
  affiliateGetResponseSchema,
  bodySchema,
  errorSchema,
  paramsSchema,
} from './affiliate.schemas';
import {
  SignatureCheckResult,
  verifyAffiliateSignature,
  type AffiliateTypedData,
} from './signatureVerification';

type ParamsSchema = FromSchema<typeof paramsSchema>;
type BodySchema = FromSchema<typeof bodySchema>;
type GetSuccessSchema = FromSchema<typeof affiliateGetResponseSchema>;
type CreateSuccessSchema = FromSchema<typeof affiliateCreateResponseSchema>;
type ErrorSchema = FromSchema<typeof errorSchema>;

const affiliatesRepository: AffiliatesRepository = apiContainer.get(
  affiliatesRepositorySymbol
);

const AFFILIATE_TYPED_DATA_DOMAIN = {
  name: 'CoW Swap Affiliate',
  version: '1',
};

const AFFILIATE_TYPED_DATA_TYPES: AffiliateTypedData['types'] = {
  AffiliateCode: [
    { name: 'walletAddress', type: 'address' },
    { name: 'code', type: 'string' },
    { name: 'chainId', type: 'uint256' },
  ],
};

const PAYOUTS_CHAIN_ID = 1;
const affiliate: FastifyPluginAsync = async (fastify): Promise<void> => {
  if (!isCmsEnabled) {
    logger.warn(
      'CMS is not enabled. Please check CMS_ENABLED and CMS_API_KEY environment variables'
    );
    return;
  }

  // GET /affiliate/:address
  fastify.get<{
    Params: ParamsSchema;
    Reply: GetSuccessSchema | ErrorSchema;
  }>(
    '/',
    {
      schema: {
        description: 'Get affiliate code bound to a wallet address',
        tags: ['affiliate'],
        params: paramsSchema,
        response: {
          '2XX': affiliateGetResponseSchema,
          '404': errorSchema,
          '500': errorSchema,
          '502': errorSchema,
        },
      },
    },
    async function (request, reply) {
      const address = normalizeAddress(request.params.address);

      try {
        const affiliateEntry =
          await affiliatesRepository.getAffiliateByWalletAddress({
            walletAddress: address,
          });

        if (!affiliateEntry) {
          reply.code(404).send({ message: 'Affiliate not found' });
          return;
        }

        reply.send({
          code: affiliateEntry.code,
          createdAt: affiliateEntry.createdAt,
          rewardAmount: affiliateEntry.rewardAmount,
          triggerVolume: affiliateEntry.triggerVolume,
          timeCapDays: affiliateEntry.timeCapDays,
          volumeCap: affiliateEntry.volumeCap,
          revenueSplitAffiliatePct: affiliateEntry.revenueSplitAffiliatePct,
          revenueSplitTraderPct: affiliateEntry.revenueSplitTraderPct,
          revenueSplitDaoPct: affiliateEntry.revenueSplitDaoPct,
        });
      } catch (error) {
        handleCmsError(error, reply);
      }
    }
  );

  // POST /affiliate/:address
  fastify.post<{
    Params: ParamsSchema;
    Body: BodySchema;
    Reply: CreateSuccessSchema | ErrorSchema;
  }>(
    '/',
    {
      schema: {
        description: 'Bind an affiliate code to a wallet address',
        tags: ['affiliate'],
        params: paramsSchema,
        body: bodySchema,
        response: {
          '2XX': affiliateCreateResponseSchema,
          '4XX': errorSchema,
          '5XX': errorSchema,
        },
      },
    },
    async function (request, reply) {
      const address = normalizeAddress(request.params.address);
      const walletAddress = normalizeAddress(request.body.walletAddress);
      const code = normalizeCode(request.body.code);
      const signedMessage = request.body.signedMessage;

      if (address !== walletAddress) {
        reply.code(400).send({ message: 'Affiliate wallet address mismatch' });
        return;
      }

      if (!code) {
        reply.code(400).send({ message: 'Affiliate code is required' });
        return;
      }

      if (!isValidCode(code)) {
        reply.code(400).send({ message: 'Affiliate code format is invalid' });
        return;
      }

      const typedData = buildAffiliateTypedData({
        walletAddress,
        code,
        chainId: PAYOUTS_CHAIN_ID,
      });

      try {
        const res = await verifyAffiliateSignature({
          walletAddress,
          signedMessage,
          typedData,
          client: getViemClients()[SupportedChainId.MAINNET],
        });

        if (
          res === SignatureCheckResult.invalidAddress ||
          res === SignatureCheckResult.addressIsNotSmartContract
        ) {
          reply
            .code(401)
            .send({ message: 'Affiliate signature has invalid address' });
          return;
        }

        if (res === SignatureCheckResult.invalidSignature) {
          reply.code(401).send({ message: 'Affiliate has invalid signature' });
          return;
        }
      } catch (error) {
        fastify.log.warn({ error }, 'Affiliate signature verification failed');
        reply.code(401).send({ message: 'Affiliate has invalid signature' });
        return;
      }

      try {
        const existingByWallet =
          await affiliatesRepository.getAffiliateByWalletAddress({
            walletAddress,
          });

        if (existingByWallet) {
          reply
            .code(409)
            .send({
              message: 'Affiliate wallet address already bound to a code',
            });
          return;
        }

        const existingByCode = await affiliatesRepository.getAffiliateByCode({
          code,
        });

        if (existingByCode) {
          reply.code(409).send({ message: 'Affiliate code already taken' });
          return;
        }

        const affiliateEntry = await affiliatesRepository.createAffiliate({
          code,
          walletAddress,
          signedMessage: request.body.signedMessage,
          enabled: true,
        });

        fastify.log.info(
          { walletAddress, code: affiliateEntry.code },
          'Affiliate code created'
        );

        if (isDuneEnabled) {
          const exportService = apiContainer.get<AffiliateProgramExportService>(
            affiliateProgramExportServiceSymbol
          );
          void exportService
            .exportAffiliateProgramData()
            .then((result) => {
              fastify.log.info(
                {
                  rows: result.rows,
                  maxUpdatedAt: result.signature.maxUpdatedAt,
                },
                'Affiliate program export after create'
              );
            })
            .catch((error) => {
              fastify.log.error(
                { error },
                'Affiliate program export after create failed'
              );
            });
        }

        reply.code(201).send({
          code: affiliateEntry.code,
          createdAt: affiliateEntry.createdAt,
        });
      } catch (error) {
        handleCmsError(error, reply);
      }
    }
  );
};

function buildAffiliateTypedData(params: {
  walletAddress: string;
  code: string;
  chainId: number;
}): AffiliateTypedData {
  return {
    domain: {
      ...AFFILIATE_TYPED_DATA_DOMAIN,
    },
    types: AFFILIATE_TYPED_DATA_TYPES,
    message: {
      walletAddress: params.walletAddress,
      code: params.code,
      chainId: params.chainId,
    },
  } as const;
}

function normalizeAddress(value: string): string {
  return value.toLowerCase();
}

function normalizeCode(value: string): string {
  return value.trim().toUpperCase();
}

function isValidCode(value: string): boolean {
  return AFFILIATE_CODE_REGEX.test(value);
}

function handleCmsError(error: unknown, reply: FastifyReply) {
  if (isCmsRequestError(error)) {
    if (error.status === 400 || error.status === 409) {
      reply.code(409).send({ message: 'Affiliate already exists' });
      return;
    }

    reply.code(502).send({ message: 'CMS request failed' });
    return;
  }

  reply.code(500).send({ message: 'Unexpected error' });
}

export default affiliate;
