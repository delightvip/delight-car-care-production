
import React from 'react';
import { BackupMetadata } from '../types';

interface BackupMetadataDisplayProps {
  metadata: BackupMetadata;
}

export const BackupMetadataDisplay: React.FC<BackupMetadataDisplayProps> = ({ metadata }) => {
  return (
    <div className="bg-muted p-4 rounded-md text-sm">
      <p><strong>معلومات النسخة الاحتياطية:</strong></p>
      <p>تاريخ الإنشاء: {new Date(metadata.timestamp).toLocaleString('ar-SA')}</p>
      <p>عدد الجداول: {metadata.tablesCount}</p>
      <p>الإصدار: {metadata.version}</p>
    </div>
  );
};
