import axios from "axios";

const API = axios.create({
  baseURL: "https://nagnail.lk/api/admin",
  headers: { "Content-Type": "application/json" },
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("admin_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default API;
