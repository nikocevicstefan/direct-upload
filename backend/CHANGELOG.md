# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2024-10-23

### Changed
- Renamed `initUploadService` to `initS3Client` for clarity
- Updated `S3Service` interface to use `storagePath` instead of `fileName` for better flexibility
- Modified `listFiles` to accept an optional `prefix` parameter
- Updated all methods to use `storagePath` instead of `fileName`

### Added
- Improved error handling with more specific error messages

## [1.0.1] - 2024-10-22

### Added
- Added support for TypeScript declaration files
- Added source maps and inline sources for better debugging experience
- Improved build process with declarationMap option

## [1.0.0] - YYYY-MM-DD

### Added
- Initial release of @direct-upload/s3-storage
- Functionality for generating signed URLs for upload, download, and delete operations
- Direct storage operations: listFiles, makeFilePublic, uploadFile, downloadFile, deleteFile
