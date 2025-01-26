import Cookies from 'js-cookie';
import { AuthToken } from '@/lib/auth/types';

export const setAuthToken = (token: AuthToken) => {
  Cookies.set('auth_token', token, { expires: 7, path: '/' });
};

export const removeAuthToken = () => {
  Cookies.remove('auth_token');
};

export const getAuthToken = (): AuthToken | undefined => {
  return Cookies.get('auth_token') as AuthToken;
};

export const isAuthenticated = (): boolean => {
  return !!getAuthToken();
};
