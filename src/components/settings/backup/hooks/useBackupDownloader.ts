
import { useState } from 'react';

export const useBackupDownloader = () => {
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'downloading' | 'success' | 'error'>('idle');

  const downloadBackup = async (data: any) => {
    try {
      setDownloadStatus('downloading');

      // Create a json string from the data
      const jsonData = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
      
      // Create a Blob from the JSON string
      const blob = new Blob([jsonData], { type: 'application/json' });
      
      // Create a download URL
      const url = URL.createObjectURL(blob);
      
      // Create a timestamp for the filename
      const timestamp = new Date().toISOString().split("T")[0];
      
      // Set up the download link
      const link = document.createElement("a");
      link.href = url;
      link.download = `backup-${timestamp}.json`;
      
      // Add to DOM, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL object
      URL.revokeObjectURL(url);
      
      setDownloadStatus('success');
      return true;
    } catch (error) {
      console.error("Error downloading backup:", error);
      setDownloadStatus('error');
      return false;
    }
  };

  return { 
    downloadBackup, 
    downloadStatus 
  };
};
