
export interface BackupMetadata {
  timestamp: string;
  tablesCount: number;
  version: string;
  errors?: Array<{
    table: string;
    error: string;
  }>;
}

export interface RestoreError {
  table: string;
  operation: string;
  batch?: number;
  error: string;
}
