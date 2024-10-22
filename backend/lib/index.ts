import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
  PutObjectAclCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommandInput,
  GetObjectCommandInput,
  ListObjectsV2CommandOutput,
  PutObjectAclCommandInput,
  DeleteObjectCommandInput,
  GetObjectCommandOutput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Readable } from "stream";
import { Buffer } from "buffer";

export interface S3Config {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  region: string;
}

export interface S3Service {
  // User operations (signed URLs)
  generateSignedUrl: (
    operation: "upload" | "download" | "delete",
    storagePath: string,
    options?: SignedUrlOptions
  ) => Promise<string>;

  // Direct storage operations
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

interface SignedUrlOptions {
  expiresIn?: number;
  contentType?: string;
}

class S3OperationError extends Error {
  constructor(message: string, public readonly operation: string) {
    super(message);
    this.name = "S3OperationError";
  }
}

export const initS3Client = (config: S3Config): S3Service => {
  const { endpoint, accessKeyId, secretAccessKey, bucketName, region } = config;

  const s3Client = new S3Client({
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    region,
    forcePathStyle: false,
  });

  const generateSignedUrl = async (
    operation: "upload" | "download" | "delete",
    storagePath: string,
    options: SignedUrlOptions = {}
  ): Promise<string> => {
    const { expiresIn = 3600, contentType } = options;
    let command;

    switch (operation) {
      case "upload":
        command = new PutObjectCommand({
          Bucket: bucketName,
          Key: storagePath,
          ContentType: contentType,
          ACL: "private",
        } as PutObjectCommandInput);
        break;
      case "download":
        command = new GetObjectCommand({
          Bucket: bucketName,
          Key: storagePath,
        } as GetObjectCommandInput);
        break;
      case "delete":
        command = new DeleteObjectCommand({
          Bucket: bucketName,
          Key: storagePath,
        } as DeleteObjectCommandInput);
        break;
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }

    try {
      return await getSignedUrl(s3Client, command, { expiresIn });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      throw new S3OperationError(
        `Error generating signed URL for ${operation}: ${errorMessage}`,
        `getSignedUrl:${operation}`
      );
    }
  };

  const uploadFile = async (
    storagePath: string,
    fileContent: Buffer | Uint8Array | Readable,
    contentType: string
  ): Promise<void> => {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: storagePath,
      Body: fileContent,
      ContentType: contentType,
    } as PutObjectCommandInput);

    try {
      await s3Client.send(command);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      throw new S3OperationError(
        `Error uploading file: ${errorMessage}`,
        "uploadFile"
      );
    }
  };

  const downloadFile = async (storagePath: string): Promise<Buffer> => {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: storagePath,
    } as GetObjectCommandInput);

    try {
      const response = await s3Client.send(command);
      return streamToBuffer(response.Body as Readable);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      throw new S3OperationError(
        `Error downloading file: ${errorMessage}`,
        "downloadFile"
      );
    }
  };

  const listFiles = async (prefix: string = ''): Promise<ListObjectsV2CommandOutput> => {
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix,
    });

    try {
      const response = await s3Client.send(command);
      return response;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      throw new S3OperationError(
        `Error listing files with prefix '${prefix}': ${errorMessage}`,
        "listFiles"
      );
    }
  };

  const makeFilePublic = async (storagePath: string): Promise<string> => {
    const command = new PutObjectAclCommand({
      Bucket: bucketName,
      Key: storagePath,
      ACL: "public-read",
    } as PutObjectAclCommandInput);

    try {
      await s3Client.send(command);
      return `${endpoint}/${bucketName}/${storagePath}`;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      throw new S3OperationError(
        `Error making file public: ${errorMessage}`,
        "makeFilePublic"
      );
    }
  };

  const deleteFile = async (storagePath: string): Promise<void> => {
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: storagePath,
    } as DeleteObjectCommandInput);

    try {
      await s3Client.send(command);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      throw new S3OperationError(
        `Error deleting file: ${errorMessage}`,
        "deleteFile"
      );
    }
  };

  const streamToBuffer = (stream: Readable): Promise<Buffer> => {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on("data", (chunk: Buffer) => chunks.push(chunk));
      stream.on("error", reject);
      stream.on("end", () => resolve(Buffer.concat(chunks)));
    });
  };

  return {
    generateSignedUrl,
    listFiles,
    makeFilePublic,
    deleteFile,
    uploadFile,
    downloadFile,
  };
};

export default initS3Client;
