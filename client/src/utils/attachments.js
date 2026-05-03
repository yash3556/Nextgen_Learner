const ACCEPTED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "audio/webm",
  "audio/wav",
  "audio/mpeg",
  "audio/mp4",
  "audio/ogg"
];

const EXTENSION_MIME_MAP = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".txt": "text/plain",
  ".webm": "audio/webm",
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".mp4": "audio/mp4",
  ".ogg": "audio/ogg"
};

export const MAX_UPLOAD_FILES = 6;
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
export const FILE_ACCEPT_ATTRIBUTE = `${ACCEPTED_MIME_TYPES.join(",")},${Object.keys(EXTENSION_MIME_MAP).join(",")}`;

function normalizeMimeType(value) {
  return String(value || "").trim().toLowerCase();
}

function getExtension(filename) {
  const name = String(filename || "").trim().toLowerCase();
  const index = name.lastIndexOf(".");
  if (index < 0) return "";
  return name.slice(index);
}

function getMimeTypeFromFile(file) {
  const fromFile = normalizeMimeType(file?.type);
  if (fromFile) return fromFile;
  return EXTENSION_MIME_MAP[getExtension(file?.name)] || "";
}

function readAsDataUrl(fileOrBlob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read the selected file."));
    reader.readAsDataURL(fileOrBlob);
  });
}

function createAttachmentId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 9)}`;
}

export function formatFileSize(size) {
  const bytes = Number(size) || 0;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

export function getAttachmentCategory(mimeType) {
  const value = normalizeMimeType(mimeType);
  if (value.startsWith("image/")) return "image";
  if (value.startsWith("audio/")) return "audio";
  return "document";
}

export async function filesToAttachments(fileList, { existingCount = 0, maxFiles = MAX_UPLOAD_FILES } = {}) {
  const files = Array.from(fileList || []);
  if (!files.length) return [];

  if (existingCount + files.length > maxFiles) {
    throw new Error(`You can upload up to ${maxFiles} files.`);
  }

  const prepared = [];
  for (const file of files) {
    const mimeType = getMimeTypeFromFile(file);
    if (!mimeType || !ACCEPTED_MIME_TYPES.includes(mimeType)) {
      throw new Error(`Unsupported file type: ${file.name || "unknown"}`);
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new Error(`${file.name || "File"} is too large. Maximum size is 2 MB.`);
    }

    const dataUrl = await readAsDataUrl(file);
    prepared.push({
      id: createAttachmentId(),
      name: String(file.name || "attachment").slice(0, 120),
      mimeType,
      size: Number(file.size || 0),
      dataUrl,
      uploadedAt: new Date().toISOString()
    });
  }

  return prepared;
}

export async function blobToAttachment(blob, { filename = "voice-note.webm", mimeType = "" } = {}) {
  const resolvedMime = normalizeMimeType(mimeType || blob?.type) || "audio/webm";
  if (!ACCEPTED_MIME_TYPES.includes(resolvedMime)) {
    throw new Error("Unsupported audio format from microphone.");
  }
  if ((blob?.size || 0) > MAX_UPLOAD_BYTES) {
    throw new Error("Voice note is too large. Keep recordings short.");
  }

  const dataUrl = await readAsDataUrl(blob);
  return {
    id: createAttachmentId(),
    name: String(filename || "voice-note.webm").slice(0, 120),
    mimeType: resolvedMime,
    size: Number(blob?.size || 0),
    dataUrl,
    uploadedAt: new Date().toISOString()
  };
}
