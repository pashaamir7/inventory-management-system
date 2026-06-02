import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8001";

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const detail = error.response?.data?.detail;
    const message =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
        ? detail.map((d) => d.msg).join(", ")
        : error.message || "An unexpected error occurred";
    return Promise.reject(new Error(message));
  }
);

export default api;
