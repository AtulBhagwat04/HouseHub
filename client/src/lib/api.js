import axios from 'axios';

export const TOKEN_KEY = 'househub.token';

/**
 * A normalised error type.
 *
 * The API already returns `{ success: false, message }`, so pages can always
 * show `error.message` to the user. Network failures and unexpected HTML
 * responses are translated into the same shape - raw backend errors and stack
 * traces never reach the UI.
 */
export class ApiError extends Error {
  constructor(message, { status = 0, details = undefined, isNetwork = false } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
    this.isNetwork = isNetwork;
  }

  /** Field-level messages for form highlighting. */
  get fieldErrors() {
    if (!Array.isArray(this.details)) return {};
    return this.details.reduce((accumulator, entry) => {
      if (entry?.field && !accumulator[entry.field]) accumulator[entry.field] = entry.message;
      return accumulator;
    }, {});
  }
}

const DEFAULT_MESSAGE_BY_STATUS = {
  400: 'That request could not be processed.',
  401: 'Your session has expired. Please sign in again.',
  403: 'You do not have access to that.',
  404: 'We could not find what you were looking for.',
  409: 'That conflicts with something that already exists.',
  413: 'That file or request is too large.',
  422: 'Please check the highlighted fields.',
  429: 'Too many requests. Please slow down and try again.',
};

function toApiError(error) {
  if (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') {
    return new ApiError(
      error.code === 'ECONNABORTED'
        ? 'The server took too long to respond. Please try again.'
        : 'Cannot reach the server. Check your connection and try again.',
      { status: 0, isNetwork: true },
    );
  }

  const status = error.response?.status ?? 0;
  const payload = error.response?.data;

  const message =
    (typeof payload?.message === 'string' && payload.message) ||
    DEFAULT_MESSAGE_BY_STATUS[status] ||
    'Something went wrong. Please try again.';

  return new ApiError(message, { status, details: payload?.details });
}

export const api = axios.create({
  // Unset in development on purpose: the Vite dev proxy forwards /api to the
  // Express server, so there is no CORS preflight locally.
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 20_000,
});

export function getStoredToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* private browsing - the session just won't survive a refresh */
  }
}

api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/**
 * A single 401 handler registered by AuthContext. Any 401 anywhere - expired
 * token, deleted account - drops the session exactly once instead of every
 * component handling it separately.
 */
let unauthorizedHandler = null;
export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const normalised = toApiError(error);
    if (normalised.status === 401 && unauthorizedHandler) unauthorizedHandler();
    return Promise.reject(normalised);
  },
);

/**
 * Thin wrapper that returns the API envelope `{ success, data, meta, message }`
 * so services can shape things for their pages.
 */
export async function request(method, url, { params, data, signal } = {}) {
  const response = await api.request({ method, url, params, data, signal });
  return response.data;
}

export const http = {
  get: (url, params, config) => request('get', url, { params, ...config }),
  post: (url, data, config) => request('post', url, { data, ...config }),
  patch: (url, data, config) => request('patch', url, { data, ...config }),
  put: (url, data, config) => request('put', url, { data, ...config }),
  delete: (url, params, config) => request('delete', url, { params, ...config }),
};

export default api;
