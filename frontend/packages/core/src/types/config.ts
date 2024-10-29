import { S3Service } from "@direct-upload/types";

export interface S3Config {
  endpoint: string;
  getSignedUrl: S3Service["generateSignedUrl"];
}
