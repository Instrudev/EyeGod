import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://eyegod-2.onrender.com/api",
});

const stored = localStorage.getItem("pitpc_auth");
if (stored) {
  const parsed = JSON.parse(stored);
  api.defaults.headers.common.Authorization = `Bearer ${parsed.access}`;
}

export default api;
