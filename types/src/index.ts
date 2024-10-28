import { ListObjectsV2CommandOutput } from "@aws-sdk/client-s3";
import { Readable } from "stream";

// Export all interfaces and types
export interface S3Config {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  region: string;
}

export interface SignedUrlOptions {
  expiresIn?: number;
  contentType?: string;
}

export interface S3Service {
  generateSignedUrl: (
    operation: "upload" | "download" | "delete",
    storagePath: string,
    options?: SignedUrlOptions
  ) => Promise<string>;
  listFiles: (prefix?: string) => Promise<ListObjectsV2CommandOutput>;
  makeFilePublic: (storagePath: string) => Promise<string>;
  uploadFile: (
    storagePath: string,
    fileContent: Buffer | Uint8Array | Readable,
    contentType: string
  ) => Promise<void>;
  downloadFile: (storagePath: string) => Promise<Buffer>;
  deleteFile: (storagePath: string) => Promise<void>;
}

export class S3OperationError extends Error {
  constructor(message: string, public readonly operation: string) {
    super(message);
    this.name = "S3OperationError";
  }
}
