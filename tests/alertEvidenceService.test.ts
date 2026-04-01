import { describe, expect, it } from "vitest";
import {
  detectEvidenceMimeType,
  validateEvidenceImages,
} from "../src/services/alerts/alertEvidenceService";

const buildFile = (bytes: number[], mimetype = "image/png") =>
  ({
    buffer: Buffer.from(bytes),
    mimetype,
  }) as Express.Multer.File;

describe("alertEvidenceService", () => {
  it("detecta firmas JPEG, PNG y WEBP", () => {
    expect(
      detectEvidenceMimeType(
        buildFile([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01])
      )
    ).toBe("image/jpeg");

    expect(
      detectEvidenceMimeType(
        buildFile([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d])
      )
    ).toBe("image/png");

    expect(
      detectEvidenceMimeType(
        buildFile([0x52, 0x49, 0x46, 0x46, 0xaa, 0xbb, 0xcc, 0xdd, 0x57, 0x45, 0x42, 0x50])
      )
    ).toBe("image/webp");
  });

  it("rechaza archivos cuya firma binaria no corresponde a una imagen valida", () => {
    const invalidFile = buildFile(
      [0x3c, 0x73, 0x63, 0x72, 0x69, 0x70, 0x74, 0x3e, 0x61, 0x6c, 0x65, 0x72],
      "image/png"
    );

    expect(detectEvidenceMimeType(invalidFile)).toBeNull();
    expect(validateEvidenceImages([invalidFile])).toBe(
      "Solo se permiten imagenes validas en evidencias (JPG, PNG, WEBP)"
    );
  });
});
