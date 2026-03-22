interface RecaptchaVerifyApiResponse {
  success: boolean;
  score?: number;
  action?: string;
  hostname?: string;
  "error-codes"?: string[];
}

export interface RecaptchaVerificationResult {
  success: boolean;
  score: number | null;
  action: string | null;
  hostname: string | null;
  errorCodes: string[];
}

const RECAPTCHA_VERIFY_URL =
  "https://www.google.com/recaptcha/api/siteverify";

const getRecaptchaSecretKey = (): string =>
  process.env.RECAPTCHA_SECRET_KEY?.trim() || "";

export const getRecaptchaMinScore = (): number => {
  const rawValue = Number(process.env.RECAPTCHA_MIN_SCORE);
  if (Number.isFinite(rawValue) && rawValue >= 0 && rawValue <= 1) {
    return rawValue;
  }
  return 0.5;
};

export const isRecaptchaConfigured = (): boolean =>
  getRecaptchaSecretKey().length > 0;

export const verifyRecaptchaToken = async (
  token: string,
  remoteIp?: string
): Promise<RecaptchaVerificationResult> => {
  const secretKey = getRecaptchaSecretKey();

  if (!secretKey) {
    return {
      success: true,
      score: null,
      action: null,
      hostname: null,
      errorCodes: [],
    };
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
    score: typeof data.score === "number" ? data.score : null,
    action: typeof data.action === "string" ? data.action : null,
    hostname: typeof data.hostname === "string" ? data.hostname : null,
    errorCodes: data["error-codes"] ?? [],
  };
};
