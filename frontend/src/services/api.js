import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api"
});

export const clearStoredSession = () => {
  localStorage.removeItem("visondesk_token");
  localStorage.removeItem("visondesk_user");
};

export const notifySessionExpired = () => {
  clearStoredSession();
  window.dispatchEvent(new Event("visiondesk:session-expired"));
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("visondesk_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || error.message || "An unexpected error occurred";
    
    if (error.response?.status === 401) {
      notifySessionExpired();
    }
    
    console.error(`[API Error] ${error.config?.method?.toUpperCase()} ${error.config?.url}:`, message);
    
    // Attach the cleaned message to the error object for easier access in components
    error.apiMessage = message;
    
    return Promise.reject(error);
  }
);

export default api;
