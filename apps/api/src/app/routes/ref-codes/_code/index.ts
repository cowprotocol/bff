import { FastifyPluginAsync, FastifyReply } from 'fastify';
import { FromSchema } from 'json-schema-to-ts';
import {
  AffiliatesRepository,
  affiliatesRepositorySymbol,
  isCmsEnabled,
  isCmsRequestError,
} from '@cowprotocol/repositories';
import { apiContainer } from '../../../inversify.config';
import { logger } from '@cowprotocol/shared';
import { errorSchema, paramsSchema, responseSchema } from './refCodes.schemas';
import { AFFILIATE_CODE_REGEX } from '../../../config/affiliate';

type ParamsSchema = FromSchema<typeof paramsSchema>;
type SuccessSchema = FromSchema<typeof responseSchema>;
type ErrorSchema = FromSchema<typeof errorSchema>;

const affiliatesRepository: AffiliatesRepository = apiContainer.get(
  affiliatesRepositorySymbol
);

const refCodes: FastifyPluginAsync = async (fastify): Promise<void> => {
  if (!isCmsEnabled) {
    logger.warn(
      'CMS is not enabled. Please check CMS_ENABLED and CMS_API_KEY environment variables'
    );
    return;
  }

  // GET /ref-codes/:code
  fastify.get<{
    Params: ParamsSchema;
    Reply: SuccessSchema | ErrorSchema;
  }>(
    '/',
    {
      schema: {
        description: 'Validate an affiliate referral code',
        tags: ['ref-codes'],
        params: paramsSchema,
        response: {
          '2XX': responseSchema,
          '400': errorSchema,
          '404': errorSchema,
          '403': errorSchema,
          '500': errorSchema,
          '502': errorSchema,
        },
      },
    },
    async function (request, reply) {
      const code = normalizeCode(request.params.code);

      if (!code) {
        reply.code(400).send({ message: 'Affiliate code is required' });
        return;
      }

      if (!isValidCode(code)) {
        reply.code(400).send({ message: 'Affiliate code format is invalid' });
        return;
      }

      try {
        const affiliateEntry = await affiliatesRepository.getAffiliateByCode({
          code,
        });

        if (!affiliateEntry) {
          reply.code(404).send({ message: 'Affiliate code not found' });
          return;
        }

        if (!affiliateEntry.enabled) {
          reply.code(403).send({ message: 'Affiliate code disabled' });
          return;
        }

        reply.send({
          code: affiliateEntry.code,
          traderRewardAmount:
            (affiliateEntry.rewardAmount *
              affiliateEntry.revenueSplitTraderPct) /
            100,
          triggerVolume: affiliateEntry.triggerVolume,
          timeCapDays: affiliateEntry.timeCapDays,
          volumeCap: affiliateEntry.volumeCap,
        });
      } catch (error) {
        handleCmsError(error, reply);
      }
    }
  );
};

function normalizeCode(value: string): string {
  return value.trim().toUpperCase();
}

function isValidCode(value: string): boolean {
  return AFFILIATE_CODE_REGEX.test(value);
}

function handleCmsError(error: unknown, reply: FastifyReply) {
  if (isCmsRequestError(error)) {
    reply.code(502).send({ message: 'CMS request failed' });
    return;
  }

  reply.code(500).send({ message: 'Unexpected error' });
}

export default refCodes;
