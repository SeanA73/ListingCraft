import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

// Attach Bearer token from localStorage as a fallback for browsers that reject 3rd-party cookies.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("lc_token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function saveToken(t) {
  if (t) localStorage.setItem("lc_token", t);
}
export function clearToken() {
  localStorage.removeItem("lc_token");
}
