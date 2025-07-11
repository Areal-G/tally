import axios from "axios";
import Cookies from "js-cookie";

const axiosInstance = axios.create({
  // Same-origin in the browser; server-side calls use the configured app URL.
  baseURL:
    typeof window !== "undefined"
      ? "/api"
      : `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000"}/api`,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Ensure cookies are sent with requests
});

axiosInstance.interceptors.request.use((config) => {
  const token = Cookies.get("session_id");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default axiosInstance;
