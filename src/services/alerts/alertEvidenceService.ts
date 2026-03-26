import { Request } from "express";
import cloudinary from "../../config/cloudinary";

export type UploadedEvidence = {
  secureUrl: string;
  mimeType: string;
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

  const base64 = file.buffer.toString("base64");
  const dataUri = `data:${file.mimetype};base64,${base64}`;
  const resourceType = file.mimetype.startsWith("video/") ? "video" : "image";

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
  const hasInvalidMime = files.some((file) => !file.mimetype.startsWith("image/"));
  if (hasInvalidMime) {
    return "Solo se permiten imagenes en evidencias (JPG, PNG, WEBP)";
  }
  return null;
};

export const uploadEvidenceBatch = async (
  files: Express.Multer.File[]
): Promise<UploadedEvidence[]> => {
  const uploads = await Promise.all(
    files.map(async (file) => {
      const uploaded = await uploadEvidenceToCloudinary(file);
      return {
        secureUrl: uploaded.secure_url,
        mimeType: file.mimetype,
      };
    })
  );

  return uploads;
};
