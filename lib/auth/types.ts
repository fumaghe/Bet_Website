export type AuthToken = string;

export interface AuthState {
  isAuthenticated: boolean;
  token?: AuthToken;
}
