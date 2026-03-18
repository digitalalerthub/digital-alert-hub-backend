interface RecaptchaVerifyApiResponse {
  success: boolean;
  "error-codes"?: string[];
}

export interface RecaptchaVerificationResult {
  success: boolean;
  errorCodes: string[];
}

const RECAPTCHA_VERIFY_URL =
  "https://www.google.com/recaptcha/api/siteverify";

const getRecaptchaSecretKey = (): string =>
  process.env.RECAPTCHA_SECRET_KEY?.trim() || "";

export const isRecaptchaConfigured = (): boolean =>
  getRecaptchaSecretKey().length > 0;

export const verifyRecaptchaToken = async (
  token: string,
  remoteIp?: string
): Promise<RecaptchaVerificationResult> => {
  const secretKey = getRecaptchaSecretKey();

  if (!secretKey) {
    return { success: true, errorCodes: [] };
  }

  const params = new URLSearchParams({
    secret: secretKey,
    response: token,
  });

  if (remoteIp) {
    params.append("remoteip", remoteIp);
  }

  const response = await fetch(RECAPTCHA_VERIFY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error(
      `reCAPTCHA verification request failed with status ${response.status}`
    );
  }

  const data = (await response.json()) as RecaptchaVerifyApiResponse;

  return {
    success: Boolean(data.success),
    errorCodes: data["error-codes"] ?? [],
  };
};
