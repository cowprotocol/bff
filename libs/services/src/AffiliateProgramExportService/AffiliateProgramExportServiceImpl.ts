import { AffiliatesRepository, DuneRepository } from '@cowprotocol/repositories';
import {
  AffiliateProgramExportResult,
  AffiliateProgramExportService,
  AffiliateProgramSignature,
} from './AffiliateProgramExportService';
import { getAffiliateProgramTableName } from './AffiliateProgramExportService.config';

type AffiliateProgramRow = {
  code: string;
  affiliate_address: string;
  enabled: boolean;
  reward_amount: number;
  trigger_volume: number;
  time_cap_days: number;
  volume_cap: number;
  revenue_split_affiliate_pct: number;
  revenue_split_trader_pct: number;
  revenue_split_dao_pct: number;
  updated_at: string;
};

export class AffiliateProgramExportServiceImpl
  implements AffiliateProgramExportService
{
  constructor(
    private readonly affiliatesRepository: AffiliatesRepository,
    private readonly duneRepository: DuneRepository
  ) {}

  async exportAffiliateProgramData(): Promise<AffiliateProgramExportResult> {
    const { rows, signature } = await this.buildAffiliateProgramData();
    await this.upload(rows);
    return { rows: rows.length, signature };
  }

  async exportAffiliateProgramDataIfChanged(
    lastSignature: AffiliateProgramSignature | null
  ): Promise<{ uploaded: boolean; result: AffiliateProgramExportResult }> {
    const { rows, signature } = await this.buildAffiliateProgramData();
    const shouldUpload = !lastSignature || !isSameSignature(lastSignature, signature);

    if (!shouldUpload) {
      return { uploaded: false, result: { rows: rows.length, signature } };
    }

    await this.upload(rows);
    return { uploaded: true, result: { rows: rows.length, signature } };
  }

  private async buildAffiliateProgramData(): Promise<{
    rows: AffiliateProgramRow[];
    signature: AffiliateProgramSignature;
  }> {
    const affiliates = await this.affiliatesRepository.listAffiliates();
    const rows = affiliates.map((affiliate) => ({
      code: affiliate.code.trim().toUpperCase(),
      affiliate_address: affiliate.walletAddress.toLowerCase(),
      enabled: affiliate.enabled,
      reward_amount: affiliate.rewardAmount,
      trigger_volume: affiliate.triggerVolume,
      time_cap_days: affiliate.timeCapDays,
      volume_cap: affiliate.volumeCap,
      revenue_split_affiliate_pct: affiliate.revenueSplitAffiliatePct,
      revenue_split_trader_pct: affiliate.revenueSplitTraderPct,
      revenue_split_dao_pct: affiliate.revenueSplitDaoPct,
      updated_at: affiliate.updatedAt,
    }));

    const maxUpdatedAt = rows.reduce<string | null>((max, row) => {
      if (!row.updated_at) {
        return max;
      }
      if (!max || row.updated_at > max) {
        return row.updated_at;
      }
      return max;
    }, null);

    return {
      rows,
      signature: {
        maxUpdatedAt,
        rowCount: rows.length,
      },
    };
  }

  private async upload(rows: AffiliateProgramRow[]): Promise<void> {
    const csv = buildCsv(rows);
    const tableName = getAffiliateProgramTableName();
    const response = await this.duneRepository.uploadCsv({
      tableName,
      data: csv,
      isPrivate: true,
    });
    if (!response.success) {
      const message = response.message ? `: ${response.message}` : '';
      throw new Error(`Dune CSV upload failed for ${tableName}${message}`);
    }
  }
}

function isSameSignature(
  left: AffiliateProgramSignature,
  right: AffiliateProgramSignature
): boolean {
  return (
    left.rowCount === right.rowCount &&
    left.maxUpdatedAt === right.maxUpdatedAt
  );
}

const CSV_HEADERS = [
  'code',
  'affiliate_address',
  'enabled',
  'reward_amount',
  'trigger_volume',
  'time_cap_days',
  'volume_cap',
  'revenue_split_affiliate_pct',
  'revenue_split_trader_pct',
  'revenue_split_dao_pct',
];

function buildCsv(rows: AffiliateProgramRow[]): string {
  const header = CSV_HEADERS.join(',');
  const lines = rows.map((row) =>
    [
      row.code,
      row.affiliate_address,
      row.enabled,
      row.reward_amount,
      row.trigger_volume,
      row.time_cap_days,
      row.volume_cap,
      row.revenue_split_affiliate_pct,
      row.revenue_split_trader_pct,
      row.revenue_split_dao_pct,
    ]
      .map(csvEscape)
      .join(',')
  );

  return [header, ...lines].join('\n');
}

function csvEscape(value: unknown): string {
  const stringValue = String(value ?? '');
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}
