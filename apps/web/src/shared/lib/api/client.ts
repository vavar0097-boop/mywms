import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
} from "axios";

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || "";

const normalizedBaseUrl = rawBaseUrl.replace(/\/$/, "");

const baseURL = normalizedBaseUrl ? `${normalizedBaseUrl}/api` : "/api";

export const apiClient = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

const refreshClient = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

let refreshPromise: Promise<void> | null = null;

function dispatchAuthExpired() {
  window.dispatchEvent(new CustomEvent("wms:auth-expired"));
}

function dispatchApiUnavailable() {
  window.dispatchEvent(new CustomEvent("wms:api-unavailable"));
}

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post("/auth/refresh")
      .then(() => undefined)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error?.response?.status;
    const currentPath = window.location.pathname;
    const originalRequest = error.config as
      | RetriableRequestConfig
      | undefined;
    const requestUrl = originalRequest?.url || "";

    if (!error.response) {
      dispatchApiUnavailable();
      return Promise.reject(error);
    }

    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !requestUrl.includes("/auth/login") &&
      !requestUrl.includes("/auth/logout") &&
      !requestUrl.includes("/auth/refresh")
    ) {
      originalRequest._retry = true;

      try {
        await refreshAccessToken();
        return apiClient(originalRequest);
      } catch {
        if (currentPath !== "/login") {
          dispatchAuthExpired();
        }
      }
    } else if (status === 401 && currentPath !== "/login") {
      dispatchAuthExpired();
    }

    return Promise.reject(error);
  },
);
