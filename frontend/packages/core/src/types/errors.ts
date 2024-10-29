export class S3ClientError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = "S3ClientError";
  }
}
