export interface QrScanRepository {
  recordScan(token: string, timestamp: Date): Promise<void>;
}
