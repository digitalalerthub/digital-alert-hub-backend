export type RequestAuthUser = {
  id: number | string;
  email?: string;
  rol?: unknown;
  role_name?: string | null;
  session_version?: number | null;
};
