/**
 * API Service for UserAPI Backend Integration
 * Handles authentication and user data operations
 * Supports both cookie-based and localStorage-based authentication
 */

// API Base URL configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

// Token management keys
const TOKEN_KEY = 'authToken';
const USER_KEY = 'user';

// Cookie name (must match backend config)
const COOKIE_NAME = 'authToken';

/**
 * Store authentication token in HTTP-only cookie (via backend)
 * This is handled by the backend during login/register
 * We also store in localStorage for backward compatibility
 * @param {string} token - JWT token from backend
 */
export const setToken = (token) => {
  localStorage.setItem(TOKEN_KEY, token);
};

/**
 * Retrieve authentication token from localStorage
 * @returns {string|null} JWT token or null if not found
 */
export const getToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

/**
 * Remove authentication token from localStorage
 */
export const removeToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

/**
 * Store user data in localStorage
 * @param {object} user - User data object
 */
export const setUser = (user) => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

/**
 * Retrieve user data from localStorage
 * @returns {object|null} User object or null if not found
 */
export const getUser = () => {
  const userData = localStorage.getItem(USER_KEY);
  return userData ? JSON.parse(userData) : null;
};

/**
 * Remove user data from localStorage
 */
export const removeUser = () => {
  localStorage.removeItem(USER_KEY);
};

/**
 * Check if user is authenticated
 * @returns {boolean} True if valid token exists
 */
export const isAuthenticated = () => {
  const token = getToken();
  return !!token && isTokenValid();
};

/**
 * Validate token structure
 * @returns {boolean} True if token structure is valid
 */
export const isTokenValid = () => {
  const token = getToken();
  if (!token) return false;
  
  try {
    // Basic JWT structure check (header.payload.signature)
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    // Check if token is expired (optional, if payload includes exp)
    // For now, just basic structure check
    return true;
  } catch (error) {
    console.error('Token validation error:', error);
    return false;
  }
};

/**
 * Helper function to make authenticated API requests
 * Note: With cookie-based auth, the Authorization header is optional
 * The cookie is automatically sent by the browser with credentials: 'include'
 * @param {string} endpoint - API endpoint
 * @param {object} options - Fetch options
 * @returns {Promise<object>} Response data
 */
const authenticatedRequest = async (endpoint, options = {}) => {
  const token = getToken();
  
  const config = {
    ...options,
    credentials: 'include', // Important: Include cookies in requests
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};

/**
 * AUTHENTICATION FUNCTIONS
 */

/**
 * Login user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<object>} Login response with user data and token
 */
export const login = async (email, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Important: Include cookies
      body: JSON.stringify({ email: email.toLowerCase().trim(), password }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Store token and user data for backward compatibility
    if (data.token) {
      setToken(data.token);
    }
    if (data.user) {
      setUser(data.user);
    }
    
    // Set isAuthenticated flag for backward compatibility
    localStorage.setItem('isAuthenticated', 'true');
    
    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

/**
 * Register new user
 * @param {object} userData - User registration data
 * @param {string} userData.Username - User's full name
 * @param {string} userData.email - User's email address
 * @param {string} userData.password - User's password
 * @returns {Promise<object>} Registration response with user data and token
 */
export const register = async (userData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/users/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Important: Include cookies
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Store token and user data for backward compatibility
    if (data.token) {
      setToken(data.token);
    }
    if (data.user) {
      setUser(data.user);
    }
    
    // Set isAuthenticated flag for backward compatibility
    localStorage.setItem('isAuthenticated', 'true');
    
    return data;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
};

/**
 * Logout user - clear all authentication data and cookies
 */
export const logout = async () => {
  try {
    // Call API logout to clear tokens on server and cookies
    await fetch(`${API_BASE_URL}/api/users/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Important: Include cookies so server can clear them
    });
  } catch (error) {
    console.error('Logout API error:', error);
    // Continue with local cleanup even if API call fails
  } finally {
    // Clear all local authentication data
    removeToken();
    removeUser();
    localStorage.removeItem('isAuthenticated');
  }
};

/**
 * USER DATA FUNCTIONS
 */

/**
 * Get current user profile
 * @returns {Promise<object>} User profile data
 */
export const getCurrentUser = async () => {
  return authenticatedRequest('/api/users/me');
};

/**
 * Get all users (admin function)
 * @returns {Promise<array>} Array of all users
 */
export const getAllUsers = async () => {
  return authenticatedRequest('/api/users');
};

/**
 * Get user by ID
 * @param {string} userId - User ID
 * @returns {Promise<object>} User data
 */
export const getUserById = async (userId) => {
  return authenticatedRequest(`/api/users/${userId}`);
};

/**
 * Update user profile
 * @param {string} userId - User ID
 * @param {object} userData - Updated user data
 * @returns {Promise<object>} Updated user data
 */
export const updateUser = async (userId, userData) => {
  return authenticatedRequest(`/api/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(userData),
  });
};

/**
 * Delete user (admin function)
 * @param {string} userId - User ID
 * @returns {Promise<object>} Deletion confirmation
 */
export const deleteUser = async (userId) => {
  return authenticatedRequest(`/api/users/${userId}`, {
    method: 'DELETE',
  });
};

/**
 * HELPER FUNCTIONS
 */

/**
 * Get API base URL
 * @returns {string} API base URL
 */
export const getApiBaseUrl = () => API_BASE_URL;

/**
 * Refresh user data from backend
 * @returns {Promise<object|null>} Current user data or null
 */
export const refreshUserData = async () => {
  try {
    const user = await getCurrentUser();
    if (user) {
      setUser(user);
    }
    return user;
  } catch (error) {
    console.error('Error refreshing user data:', error);
    return null;
  }
};


/**
 * TASK FUNCTIONS
 */

/**
 * Get all tasks for the current user
 * @param {object} options - Query options
 * @param {boolean} options.completed - Filter by completion status
 * @param {string} options.priority - Filter by priority
 * @param {string} options.search - Search in title
 * @param {string} options.sortBy - Field to sort by
 * @param {string} options.sortOrder - 'asc' or 'desc'
 * @returns {Promise<array>} Array of tasks
 */
export const getTasks = async (options = {}) => {
  const params = new URLSearchParams();
  if (options.completed !== undefined) params.append('completed', options.completed);
  if (options.priority) params.append('priority', options.priority);
  if (options.search) params.append('search', options.search);
  if (options.sortBy) params.append('sortBy', options.sortBy);
  if (options.sortOrder) params.append('sortOrder', options.sortOrder);
  
  const queryString = params.toString();
  const endpoint = queryString ? `/api/tasks?${queryString}` : '/api/tasks';
  
  return authenticatedRequest(endpoint);
};

/**
 * Get task statistics for the current user
 * @returns {Promise<object>} Task statistics
 */
export const getTaskStats = async () => {
  return authenticatedRequest('/api/tasks/stats');
};

/**
 * Add a new task for the current user
 * @param {string} title - Task title
 * @param {string} description - Task description (optional)
 * @param {string} priority - Task priority (optional)
 * @param {Date} dueDate - Task due date (optional)
 * @returns {Promise<object>} Created task
 */
export const addTask = async (title, description = '', priority = 'medium', dueDate = null) => {
  return authenticatedRequest('/api/tasks', {
    method: 'POST',
    body: JSON.stringify({ title, description, priority, dueDate }),
  });
};

/**
 * Update a task
 * @param {string} taskId - Task ID
 * @param {object} taskData - Updated task data
 * @param {string} taskData.title - Task title
 * @param {string} taskData.description - Task description
 * @param {boolean} taskData.completed - Completion status
 * @param {string} taskData.priority - Task priority
 * @param {Date} taskData.dueDate - Task due date
 * @returns {Promise<object>} Updated task
 */
export const updateTask = async (taskId, taskData) => {
  return authenticatedRequest(`/api/tasks/${taskId}`, {
    method: 'PUT',
    body: JSON.stringify(taskData),
  });
};

/**
 * Delete a task
 * @param {string} taskId - Task ID
 * @returns {Promise<object>} Deletion confirmation
 */
export const deleteTask = async (taskId) => {
  return authenticatedRequest(`/api/tasks/${taskId}`, {
    method: 'DELETE',
  });
};

/**
 * Get a single task by ID
 * @param {string} taskId - Task ID
 * @returns {Promise<object>} Task data
 */
export const getTaskById = async (taskId) => {
  return authenticatedRequest(`/api/tasks/${taskId}`);
};

/**
 * Replace all tasks (for syncing)
 * @param {array} tasks - Array of tasks with structure { title, description, completed, priority, dueDate, createdAt }
 * @returns {Promise<object>} Updated tasks
 */
export const replaceTasks = async (tasks) => {
  return authenticatedRequest('/api/tasks', {
    method: 'PUT',
    body: JSON.stringify({ tasks }),
  });
};



export default {
  // Authentication
  login,
  register,
  logout,
  
  // User data
  getCurrentUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  
  // Token management
  setToken,
  getToken,
  removeToken,
  
  // User management
  setUser,
  getUser,
  removeUser,
  
  // Authentication check
  isAuthenticated,
  
  // Utilities
  getApiBaseUrl,
  refreshUserData,
  
  // Task functions
  getTasks,
  getTaskStats,
  getTaskById,
  addTask,
  updateTask,
  deleteTask,
  replaceTasks,
};

