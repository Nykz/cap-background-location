/**
 * Form model for the queue + HTTP upload configuration.
 * Mapped to the plugin's SetConfigOptions by UploadService.
 */
export interface UploadSettings {
  queueEnabled: boolean;
  maxSize: number;
  uploadEnabled: boolean;
  url: string;
  bearerToken: string;
  batchSize: number;
  flushInterval: number;
  deviceLabel: string;
}
