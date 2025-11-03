// API Configuration
// This file centralizes the backend API URL configuration

export const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

// API Endpoints
export const API_ENDPOINTS = {
  executeStep: `${API_BASE_URL}/api/execute-step`,
  executeWorkflow: `${API_BASE_URL}/api/execute-workflow`,
  browserControl: `${API_BASE_URL}/api/browser`,
  health: `${API_BASE_URL}/api/health`,
  browserStreamInfo: `${API_BASE_URL}/api/browser-stream-info`,
  browserState: `${API_BASE_URL}/api/browser-state`,
};

// Helper function to check if backend is available
export const checkBackendHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(API_ENDPOINTS.health);
    return response.ok;
  } catch {
    return false;
  }
};
