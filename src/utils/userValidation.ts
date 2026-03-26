export const NAME_REGEX = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s'-]{2,100}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_REGEX = /^\d{7,15}$/;
export const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export const normalizeEmail = (value: unknown): string => {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
};

export const normalizePhone = (value: unknown): string => {
  return typeof value === "string" ? value.trim() : "";
};

export const normalizeName = (value: unknown): string => {
  return typeof value === "string" ? value.trim() : "";
};

export const validateName = (
  value: string,
  fieldLabel: "nombre" | "apellido"
): string | null => {
  if (!NAME_REGEX.test(value)) {
    return `El ${fieldLabel} solo puede contener letras, espacios, apostrofes o guiones, y debe tener al menos 2 caracteres`;
  }

  return null;
};

export const validateEmail = (value: string): string | null => {
  if (!EMAIL_REGEX.test(value)) {
    return "Debes ingresar un correo electronico con formato valido";
  }

  return null;
};

export const validatePhone = (
  value: string,
  options?: { required?: boolean }
): string | null => {
  const required = options?.required ?? false;

  if (!value) {
    return required
      ? "El telefono debe contener solo numeros y tener entre 7 y 15 digitos"
      : null;
  }

  if (!PHONE_REGEX.test(value)) {
    return "El telefono debe contener solo numeros y tener entre 7 y 15 digitos";
  }

  return null;
};

export const validatePassword = (value: string): string | null => {
  if (!PASSWORD_REGEX.test(value)) {
    return "La contrasena debe tener minimo 8 caracteres e incluir letras y numeros";
  }

  return null;
};
