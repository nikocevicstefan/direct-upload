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

export interface UploadService {
  // User operations (signed URLs)
  generateSignedUrl: (
    operation: "upload" | "download" | "delete",
    fileName: string,
    options?: SignedUrlOptions
  ) => Promise<string>;

  // Direct storage operations
  listFiles: () => Promise<ListObjectsV2CommandOutput["Contents"]>;
  makeFilePublic: (fileName: string) => Promise<string>;
  uploadFile: (
    fileName: string,
    fileContent: Buffer | Uint8Array | Readable,
    contentType: string
  ) => Promise<void>;
  downloadFile: (fileName: string) => Promise<Buffer>;
  deleteFile: (fileName: string) => Promise<void>;
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

export const initUploadService = (config: S3Config): UploadService => {
  const { endpoint, accessKeyId, secretAccessKey, bucketName, region } = config;

  const s3Client = new S3Client({
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    region,
    forcePathStyle: false,
  });

  const generateSignedUrl = async (
    operation: "upload" | "download" | "delete",
    fileName: string,
    options: SignedUrlOptions = {}
  ): Promise<string> => {
    const { expiresIn = 3600, contentType } = options;
    let command;

    switch (operation) {
      case "upload":
        command = new PutObjectCommand({
          Bucket: bucketName,
          Key: `uploads/${fileName}`,
          ContentType: contentType,
          ACL: "private",
        } as PutObjectCommandInput);
        break;
      case "download":
        command = new GetObjectCommand({
          Bucket: bucketName,
          Key: `uploads/${fileName}`,
        } as GetObjectCommandInput);
        break;
      case "delete":
        command = new DeleteObjectCommand({
          Bucket: bucketName,
          Key: `uploads/${fileName}`,
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
    fileName: string,
    fileContent: Buffer | Uint8Array | Readable,
    contentType: string
  ): Promise<void> => {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: `uploads/${fileName}`,
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

  const downloadFile = async (fileName: string): Promise<Buffer> => {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: `uploads/${fileName}`,
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

  const listFiles = async (): Promise<
    ListObjectsV2CommandOutput["Contents"]
  > => {
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: "uploads/",
    });

    try {
      const response = await s3Client.send(command);
      return response.Contents || [];
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      throw new S3OperationError(
        `Error listing files: ${errorMessage}`,
        "listFiles"
      );
    }
  };

  const makeFilePublic = async (fileName: string): Promise<string> => {
    const command = new PutObjectAclCommand({
      Bucket: bucketName,
      Key: `uploads/${fileName}`,
      ACL: "public-read",
    } as PutObjectAclCommandInput);

    try {
      await s3Client.send(command);
      return `${endpoint}/${bucketName}/uploads/${fileName}`;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      throw new S3OperationError(
        `Error making file public: ${errorMessage}`,
        "makeFilePublic"
      );
    }
  };

  const deleteFile = async (fileName: string): Promise<void> => {
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: `uploads/${fileName}`,
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

export default initUploadService;
