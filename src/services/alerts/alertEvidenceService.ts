import { Request } from "express";
import cloudinary from "../../config/cloudinary";

export type UploadedEvidence = {
  secureUrl: string;
  mimeType: string;
};

const JPEG_SIGNATURE = [0xff, 0xd8, 0xff] as const;
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47] as const;
const RIFF_SIGNATURE = [0x52, 0x49, 0x46, 0x46] as const;
const WEBP_SIGNATURE = [0x57, 0x45, 0x42, 0x50] as const;

const hasSignatureAt = (
  buffer: Buffer,
  signature: readonly number[],
  offset = 0
): boolean => {
  if (buffer.length < offset + signature.length) return false;

  return signature.every((byte, index) => buffer[offset + index] === byte);
};

export const detectEvidenceMimeType = (
  file: Pick<Express.Multer.File, "buffer">
): string | null => {
  const { buffer } = file;
  if (!buffer || buffer.length < 12) {
    return null;
  }

  if (hasSignatureAt(buffer, JPEG_SIGNATURE)) {
    return "image/jpeg";
  }

  if (hasSignatureAt(buffer, PNG_SIGNATURE)) {
    return "image/png";
  }

  if (
    hasSignatureAt(buffer, RIFF_SIGNATURE) &&
    hasSignatureAt(buffer, WEBP_SIGNATURE, 8)
  ) {
    return "image/webp";
  }

  return null;
};

export const isMissingCloudinaryConfigurationError = (error: unknown): boolean =>
  error instanceof Error && error.message === "Cloudinary no configurado";

const uploadEvidenceToCloudinary = async (file: Express.Multer.File) => {
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    throw new Error("Cloudinary no configurado");
  }

  const detectedMimeType = detectEvidenceMimeType(file);
  if (!detectedMimeType) {
    throw new Error("Archivo de evidencia invalido");
  }

  const base64 = file.buffer.toString("base64");
  const dataUri = `data:${detectedMimeType};base64,${base64}`;
  const resourceType = "image";

  return cloudinary.uploader.upload(dataUri, {
    folder: "digital-alert-hub/evidencias",
    resource_type: resourceType,
  });
};

export const getUploadedEvidenceFiles = (req: Request): Express.Multer.File[] => {
  const filesContainer = req.files as
    | { [fieldname: string]: Express.Multer.File[] }
    | Express.Multer.File[]
    | undefined;

  if (!filesContainer) return [];
  if (Array.isArray(filesContainer)) return filesContainer;

  const multiFiles = filesContainer.evidencias ?? [];
  const legacyFiles = filesContainer.evidencia ?? [];
  return [...multiFiles, ...legacyFiles];
};

export const validateEvidenceImages = (files: Express.Multer.File[]): string | null => {
  const hasInvalidContent = files.some((file) => {
    const detectedMimeType = detectEvidenceMimeType(file);
    return !detectedMimeType;
  });
  if (hasInvalidContent) {
    return "Solo se permiten imagenes validas en evidencias (JPG, PNG, WEBP)";
  }
  return null;
};

export const uploadEvidenceBatch = async (
  files: Express.Multer.File[]
): Promise<UploadedEvidence[]> => {
  const uploads = await Promise.all(
    files.map(async (file) => {
      const detectedMimeType = detectEvidenceMimeType(file);
      if (!detectedMimeType) {
        throw new Error("Archivo de evidencia invalido");
      }

      const uploaded = await uploadEvidenceToCloudinary(file);
      return {
        secureUrl: uploaded.secure_url,
        mimeType: detectedMimeType,
      };
    })
  );

  return uploads;
};
