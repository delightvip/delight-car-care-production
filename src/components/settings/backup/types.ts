
export interface BackupMetadata {
  timestamp: string;
  tablesCount: number;
  version: string;
  recordsCount?: number;
  partiesStats?: {
    partiesCount: number;
    balancesCount: number;
    mismatch: boolean;
  };
  duplicateBalancesRemoved?: number;
  errors?: Array<{
    table: string;
    error: string;
  }>;
}

export interface RestoreError {
  table: string;
  operation: string;
  batch?: number;
  party_id?: string;
  error: string;
}
