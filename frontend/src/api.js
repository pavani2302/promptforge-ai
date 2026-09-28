import axios from "axios";

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    "http://localhost:8000",

  headers: {
    "Content-Type": "application/json",
  },
});

/*
 * Attach JWT token to every request.
 */
api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("token");

    if (token) {
      config.headers.Authorization =
        `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/*
 * Handle unauthorized requests.
 */
api.interceptors.response.use(
  (response) => response,

  (error) => {
    if (
      error.response?.status === 401
    ) {
      localStorage.removeItem(
        "token"
      );
    }

    return Promise.reject(error);
  }
);

/*
 * Authentication
 */

export const login = (
  email,
  password
) =>
  api.post(
    "/api/auth/login",
    {
      email,
      password,
    }
  );

export const register = (
  name,
  email,
  password
) =>
  api.post(
    "/api/auth/register",
    {
      name,
      email,
      password,
    }
  );

/*
 * Prompt optimization
 */

export const optimize = (
  data
) =>
  api.post(
    "/api/prompts/optimize",
    data
  );

/*
 * Prompt history
 */

export const history = () =>
  api.get(
    "/api/prompts/history"
  );

/*
 * Delete one prompt
 */

export const deletePrompt = (
  id
) =>
  api.delete(
    `/api/prompts/${id}`
  );

/*
 * Prompt versions
 */

export const versions = (
  id
) =>
  api.get(
    `/api/prompts/${id}/versions`
  );

export default api;