import { apiContainer } from './inversify.config';
import { logger } from '@cowprotocol/shared';
import {
  isCmsEnabled,
  isDuneEnabled,
} from '@cowprotocol/repositories';
import {
  AffiliateProgramExportService,
  AffiliateProgramSignature,
  affiliateProgramExportServiceSymbol,
} from '@cowprotocol/services';

const POLL_INTERVAL_MS = 5 * 60 * 1000;

let lastSignature: AffiliateProgramSignature | null = null;
let inFlight = false;

export function startAffiliateProgramExportPoller():
  | (() => void)
  | undefined {
  if (!isCmsEnabled || !isDuneEnabled) {
    logger.warn(
      'Affiliate export poller disabled (CMS or Dune not enabled).'
    );
    return;
  }

  const run = async () => {
    if (inFlight) {
      return;
    }

    inFlight = true;
    try {
      const exportService = apiContainer.get<AffiliateProgramExportService>(
        affiliateProgramExportServiceSymbol
      );
      const result = await exportService.exportAffiliateProgramDataIfChanged(
        lastSignature
      );
      lastSignature = result.result.signature;

      if (result.uploaded) {
        logger.info(
          {
            rows: result.result.rows,
            maxUpdatedAt: result.result.signature.maxUpdatedAt,
          },
          'Affiliate program export poller uploaded data'
        );
      } else {
        logger.debug(
          {
            rows: result.result.rows,
            maxUpdatedAt: result.result.signature.maxUpdatedAt,
          },
          'Affiliate program export poller skipped (no change)'
        );
      }
    } catch (error) {
      logger.error({ error }, 'Affiliate program export poller failed');
    } finally {
      inFlight = false;
    }
  };

  void run();
  const intervalId = setInterval(run, POLL_INTERVAL_MS);
  return () => clearInterval(intervalId);
}
