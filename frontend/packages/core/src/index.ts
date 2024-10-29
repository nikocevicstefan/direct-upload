import { Readable } from "stream";
import { S3Config } from "./types/config";
import {
  DownloadOptions,
  FileOperation,
  UploadOptions,
} from "./types/operations";
import { S3ClientError } from "./types/errors";

export class S3Client {
  private config: S3Config;

  constructor(config: S3Config) {
    this.config = config;
  }

  async uploadFile({
    file,
    path,
    onProgress,
    onError,
    contentType,
  }: UploadOptions): Promise<FileOperation> {
    const controller = new AbortController();
    const operation: FileOperation = {
      abort: () => controller.abort(),
      promise: (async () => {
        try {
          const signedUrl = await this.config.getSignedUrl("upload", path);

          const stream = file.stream();
          const totalSize = file.size;
          let loadedSize = 0;

          const transformStream = new TransformStream({
            transform(chunk, controller) {
              loadedSize += chunk.length;
              onProgress?.((loadedSize / totalSize) * 100);
              controller.enqueue(chunk);
            },
          });

          const response = await fetch(signedUrl, {
            method: "PUT",
            headers: {
              "Content-Type": contentType || file.type,
              "Content-Length": totalSize.toString(),
            },
            body: stream.pipeThrough(transformStream),
            signal: controller.signal,
          });

          if (!response.ok) {
            throw new S3ClientError("Failed to upload file", "upload");
          }

          return { success: true, path };
        } catch (error) {
          onError?.(error);
          return {
            success: false,
            path,
            error: error instanceof Error ? error : new Error("Unknown error"),
          };
        }
      })(),
    };

    return operation;
  }

  async downloadFile({
    path,
    filename,
    onProgress,
    onError,
  }: DownloadOptions): Promise<FileOperation> {
    const controller = new AbortController();
    const operation: FileOperation = {
      abort: () => controller.abort(),
      promise: (async () => {
        try {
          const signedUrl = await this.config.getSignedUrl("download", path);
          const response = await fetch(signedUrl, {
            signal: controller.signal,
          });

          if (!response.ok) {
            onError?.(new S3ClientError("Failed to download file", "download"));
            return {
              success: false,
              path,
              filename,
              error: new Error("Failed to download file"),
            };
          }

          const reader = response.body?.getReader();
          const contentLength = response.headers.get("Content-Length");
          const totalSize = contentLength ? parseInt(contentLength, 10) : 0;
          let loadedSize = 0;

          const stream = new ReadableStream({
            async pull(controller) {
              const result = await reader?.read();
              if (!result) return controller.close();
              if (result.done) {
                controller.close();
                return;
              }
              loadedSize += result.value.length;
              onProgress?.((loadedSize / totalSize) * 100);
              controller.enqueue(result.value);
            },
            cancel() {
              reader?.cancel();
            },
          });

          const blob = await new Response(stream).blob();
          const url = URL.createObjectURL(blob);

          const a = document.createElement("a");
          a.href = url;
          a.download = filename || path;
          a.click();
          URL.revokeObjectURL(url);
          document.body.removeChild(a);

          return { success: true, path, filename };
        } catch (error) {
          onError?.(error);
          return {
            success: false,
            path,
            filename,
            error: error instanceof Error ? error : new Error("Unknown error"),
          };
        }
      })(),
    };
    return operation;
  }
}
