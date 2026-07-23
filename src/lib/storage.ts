export interface StorageProvider {
  uploadFile(fileName: string, mimeType: string, buffer: Buffer): Promise<string>;
  downloadFile(fileKey: string): Promise<Buffer>;
  deleteFile(fileKey: string): Promise<void>;
  getFileUrl(fileKey: string): Promise<string>;
}

// Simulated S3 Provider (Storage Strategy Pattern)
export class S3StorageProvider implements StorageProvider {
  private bucket: string;

  constructor(bucketName: string = 'scm-documents-bucket') {
    this.bucket = bucketName;
    // Note: Initialize S3 Client here in the future
    // e.g. this.s3Client = new S3Client({ region: process.env.AWS_REGION });
  }

  async uploadFile(fileName: string, mimeType: string, buffer: Buffer): Promise<string> {
    const fileKey = `uploads/${Date.now()}_${fileName}`;
    console.log(`[S3 Storage] Mock uploading ${fileName} to bucket ${this.bucket} with key ${fileKey}...`);
    // Simulated upload delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Fallback for simulation: we just return the base64 string directly as the URL for now 
    // so the frontend can render it without a real S3 backend.
    // In production, this would return an S3 URI or a CDN URL.
    return `data:${mimeType};base64,${buffer.toString('base64')}`;
  }

  async downloadFile(fileKey: string): Promise<Buffer> {
    console.log(`[S3 Storage] Mock downloading ${fileKey}...`);
    return Buffer.from(''); 
  }

  async deleteFile(fileKey: string): Promise<void> {
    console.log(`[S3 Storage] Mock deleting ${fileKey} from bucket ${this.bucket}...`);
    // Simulated delete
  }

  async getFileUrl(fileKey: string): Promise<string> {
    // In a real S3 scenario, this might return a presigned URL.
    return fileKey;
  }
}

export class LocalStorageProvider implements StorageProvider {
  async uploadFile(fileName: string, mimeType: string, buffer: Buffer): Promise<string> {
    // In a real local setup, save to disk and return path
    return `data:${mimeType};base64,${buffer.toString('base64')}`;
  }

  async downloadFile(fileKey: string): Promise<Buffer> {
    return Buffer.from('');
  }

  async deleteFile(fileKey: string): Promise<void> {
  }

  async getFileUrl(fileKey: string): Promise<string> {
    return fileKey;
  }
}

// Factory to get the active storage provider based on environment config
export function getStorageProvider(): StorageProvider {
  const provider = process.env.STORAGE_PROVIDER || 'mock-s3';
  if (provider === 'local') {
    return new LocalStorageProvider();
  }
  return new S3StorageProvider();
}
