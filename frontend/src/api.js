import axios from "axios";
const api = axios.create({baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000"});
api.interceptors.request.use(config => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
export const login = (email,password) => api.post("/api/auth/login",{email,password});
export const register = (name,email,password) => api.post("/api/auth/register",{name,email,password});
export const optimize = data => api.post("/api/prompts/optimize",data);
export const history = () => api.get("/api/prompts/history");
export const versions = id => api.get(`/api/prompts/${id}/versions`);
export default api;
