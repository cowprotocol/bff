export const affiliateProgramExportServiceSymbol = Symbol.for(
  'AffiliateProgramExportService'
);

export type AffiliateProgramSignature = {
  maxUpdatedAt: string | null;
  rowCount: number;
};

export type AffiliateProgramExportResult = {
  rows: number;
  signature: AffiliateProgramSignature;
};

export interface AffiliateProgramExportService {
  exportAffiliateProgramData(): Promise<AffiliateProgramExportResult>;
  exportAffiliateProgramDataIfChanged(
    lastSignature: AffiliateProgramSignature | null
  ): Promise<{ uploaded: boolean; result: AffiliateProgramExportResult }>;
}
