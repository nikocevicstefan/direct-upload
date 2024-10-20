import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
  PutObjectAclCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const initUploadService = (config) => {
  const { endpoint, accessKeyId, secretAccessKey, bucketName, region } = config;

  const s3Client = new S3Client({
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    region,
    forcePathStyle: false,
  });

  const generatePresignedUrl = async (
    fileName,
    fileType,
    expiresIn = 60 * 5
  ) => {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: `uploads/${fileName}`,
      ContentType: fileType,
      ACL: "private",
    });

    try {
      return await getSignedUrl(s3Client, command, { expiresIn });
    } catch (err) {
      console.error("Error generating presigned URL:", err);
      throw err;
    }
  };

  // New function for direct upload
  const uploadFile = async (fileName, fileContent, contentType) => {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: `uploads/${fileName}`,
      Body: fileContent,
      ContentType: contentType,
    });

    try {
      return await s3Client.send(command);
    } catch (err) {
      console.error("Error uploading file:", err);
      throw err;
    }
  };

  // New function for direct download
  const downloadFile = async (fileName) => {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: `uploads/${fileName}`,
    });

    try {
      const response = await s3Client.send(command);
      return streamToBuffer(response.Body);
    } catch (err) {
      console.error("Error downloading file:", err);
      throw err;
    }
  };

  const listFiles = async () => {
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: "uploads/",
    });

    try {
      const response = await s3Client.send(command);
      return response.Contents || [];
    } catch (err) {
      console.error("Error listing files:", err);
      throw err;
    }
  };

  const getFile = async (fileName, expiresIn = 3600) => {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: `uploads/${fileName}`,
    });

    try {
      return await getSignedUrl(s3Client, command, { expiresIn });
    } catch (err) {
      console.error("Error getting file:", err);
      throw err;
    }
  };

  const makeFilePublic = async (fileName) => {
    const command = new PutObjectAclCommand({
      Bucket: bucketName,
      Key: `uploads/${fileName}`,
      ACL: "public-read",
    });

    try {
      await s3Client.send(command);
      return `${endpoint}/${bucketName}/uploads/${fileName}`;
    } catch (err) {
      console.error("Error making file public:", err);
      throw err;
    }
  };

  const deleteFile = async (fileName) => {
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: `uploads/${fileName}`,
    });

    try {
      return await s3Client.send(command);
    } catch (err) {
      console.error("Error deleting file:", err);
      throw err;
    }
  };

  // Helper function to convert stream to buffer
  const streamToBuffer = (stream) => {
    return new Promise((resolve, reject) => {
      const chunks = [];
      stream.on("data", (chunk) => chunks.push(chunk));
      stream.on("error", reject);
      stream.on("end", () => resolve(Buffer.concat(chunks)));
    });
  };

  return {
    generatePresignedUrl,
    listFiles,
    getFile,
    makeFilePublic,
    deleteFile,
  };
};

export default initUploadService;
