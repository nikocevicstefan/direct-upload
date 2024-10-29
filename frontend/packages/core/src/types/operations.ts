export interface UploadOptions {
  file: File;
  path: string;
  onProgress?: (progress: number) => void;
  onError?: (error: Error) => void;
  contentType?: string;
  maxRetries?: number;
}

export interface DownloadOptions {
  path: string;
  filename?: string;
  onProgress?: (progress: number) => void;
  onError?: (error: Error) => void;
}

export interface FileOperation {
  abort: () => void;
  promise: Promise<OperationResult>;
}

export interface OperationResult {
  success: boolean;
  path: string;
  error?: Error;
}
