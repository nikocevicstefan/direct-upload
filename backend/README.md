# S3 Compatible Upload Service

A TypeScript library for handling AWS S3 compatible storage operations, providing both direct storage access and secure end-user file operations via signed URLs.

## Installation

```bash
npm install @direct-upload/s3-storage
```

## Usage

```typescript
import initUploadService, { S3Config } from "@direct-upload/s3-storage";

const config: S3Config = {
  endpoint: "your-s3-endpoint",
  accessKeyId: "your-access-key-id",
  secretAccessKey: "your-secret-access-key",
  bucketName: "your-bucket-name",
  region: "your-region",
};

const uploadService = initUploadService(config);
```

## API

The `initUploadService` function returns an object with the following methods:

### User Operations (Signed URLs)

- `generateSignedUrl(operation: "upload" | "download" | "delete", fileName: string, options?: SignedUrlOptions): Promise<string>`

  Generates a signed URL for the specified operation.

  ```typescript
  const uploadUrl = await uploadService.generateSignedUrl(
    "upload",
    "example.txt",
    { contentType: "text/plain", expiresIn: 3600 }
  );
  const downloadUrl = await uploadService.generateSignedUrl(
    "download",
    "example.txt",
    { expiresIn: 1800 }
  );
  const deleteUrl = await uploadService.generateSignedUrl(
    "delete",
    "example.txt",
    { expiresIn: 300 }
  );
  ```

### Direct Storage Operations

- `listFiles(): Promise<S3.ListObjectsV2Output["Contents"]>`
- `makeFilePublic(fileName: string): Promise<string>`
- `uploadFile(fileName: string, fileContent: Buffer | Uint8Array | Readable, contentType: string): Promise<void>`
- `downloadFile(fileName: string): Promise<Buffer>`
- `deleteFile(fileName: string): Promise<void>`

## Examples

### Generating a Signed URL for Upload

```typescript
const uploadUrl = await uploadService.generateSignedUrl(
  "upload",
  "myfile.txt",
  {
    contentType: "text/plain",
    expiresIn: 3600, // URL expires in 1 hour
  }
);

// Use this URL on the client-side to upload the file directly to S3
```

### Listing Files in the Bucket

```typescript
const files = await uploadService.listFiles();
console.log(files);
```

### Uploading a File Directly (Server-side)

```typescript
await uploadService.uploadFile(
  "example.txt",
  Buffer.from("Hello, World!"),
  "text/plain"
);
```

## Security Considerations

- Use direct storage operations only in secure, server-side environments.
- Utilize signed URLs for client-side interactions to maintain security and control over S3 access.
- Always set appropriate expiration times for signed URLs to limit the window of potential misuse.

## Error Handling

The library uses custom `S3OperationError` for error handling. Always wrap your calls in try-catch blocks to handle potential errors gracefully.

## License

MIT
