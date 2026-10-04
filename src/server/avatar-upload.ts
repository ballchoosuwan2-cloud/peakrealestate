import fs from 'fs';
import path from 'path';

const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function ensureUploadsDir(): string {
  const dir = path.join(process.cwd(), 'uploads', 'avatars');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Validates and saves an uploaded avatar buffer to disk
 */
export function saveAvatarFile(
  userId: string,
  buffer: Buffer,
  mimeType: string,
  originalFileName?: string
): { relativeUrl: string; filePath: string } {
  const cleanMime = (mimeType || '').toLowerCase().trim();
  const ext = ALLOWED_MIME_TYPES[cleanMime];

  if (!ext) {
    throw new Error('Invalid file type. Only JPG, PNG, and WEBP images are supported.');
  }

  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error('File size exceeds the 5MB limit.');
  }

  // Basic magic byte validation
  if (ext === 'jpg') {
    if (buffer[0] !== 0xff || buffer[1] !== 0xd8) {
      throw new Error('Corrupted or invalid JPEG image header');
    }
  } else if (ext === 'png') {
    if (
      buffer[0] !== 0x89 ||
      buffer[1] !== 0x50 ||
      buffer[2] !== 0x4e ||
      buffer[3] !== 0x47
    ) {
      throw new Error('Corrupted or invalid PNG image header');
    }
  } else if (ext === 'webp') {
    const riff = buffer.subarray(0, 4).toString('ascii');
    const webp = buffer.subarray(8, 12).toString('ascii');
    if (riff !== 'RIFF' || webp !== 'WEBP') {
      throw new Error('Corrupted or invalid WEBP image header');
    }
  }

  const uploadDir = ensureUploadsDir();
  const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `avatar_${safeUserId}_${Date.now()}.${ext}`;
  const filePath = path.join(uploadDir, fileName);

  fs.writeFileSync(filePath, buffer);

  const relativeUrl = `/uploads/avatars/${fileName}`;
  return { relativeUrl, filePath };
}
