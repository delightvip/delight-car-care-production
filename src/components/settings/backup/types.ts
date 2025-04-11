
export interface BackupMetadata {
  timestamp: string;
  tablesCount: number;
  version: string;
  recordsCount?: number; // Adding this field to the type
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
