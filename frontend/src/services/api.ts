import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000/api",
});

const stored = localStorage.getItem("pitpc_auth");
if (stored) {
  const parsed = JSON.parse(stored);
  api.defaults.headers.common.Authorization = `Bearer ${parsed.access}`;
}

export default api;
