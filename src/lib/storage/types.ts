export interface StorageProvider {
  save(buffer: Buffer, filename: string, mimeType: string): Promise<string>
  getUrl(storedPath: string): string
  getLocalPath(storedPath: string): string | null
}
