// Determine API base URL with sensible defaults:
// - If REACT_APP_API_URL is set, use it (works for ngrok or any external host)
// - If running on localhost:3000 (CRA dev), default to localhost:5000
// - Otherwise assume same-origin (useful when backend is reverse-proxied under the same host)
const inferApiBaseUrl = () => {
  const envUrl = process.env.REACT_APP_API_URL;
  if (envUrl && envUrl.trim().length > 0) return envUrl;

  if (typeof window !== 'undefined') {
    const { origin, hostname } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      // Dev server on port 3000 usually; backend on 5000
      return 'http://localhost:5001/api';
    }
    // For ngrok or deployed environments where backend is served at same origin
    return `${origin}/api`;
  }

  // Fallback for non-browser environments
  return 'http://localhost:5001/api';
};

const API_BASE_URL = inferApiBaseUrl();

class ApiService {
  // Generic request method
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    // Get token from localStorage
    const token = localStorage.getItem('token');
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
      // Include credentials only if explicitly requested via env (cookie-based auth)
      ...(process.env.REACT_APP_INCLUDE_CREDENTIALS === 'true' ? { credentials: 'include' } : {}),
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (response.status === 401) {
        // Token expired or invalid; let caller handle state/UI
        localStorage.removeItem('token');
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Authentication required');
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Facility endpoints
  async getFacilities() {
    return this.request('/facilities');
  }

  async getFacility(id) {
    return this.request(`/facilities/${id}`);
  }

  async createFacility(facilityData) {
    return this.request('/facilities', {
      method: 'POST',
      body: JSON.stringify(facilityData),
    });
  }

  async updateFacility(id, facilityData) {
    return this.request(`/facilities/${id}`, {
      method: 'PUT',
      body: JSON.stringify(facilityData),
    });
  }

  async deleteFacility(id) {
    return this.request(`/facilities/${id}`, {
      method: 'DELETE',
    });
  }

  async getFacilitiesByStatus(status) {
    return this.request(`/facilities/status/${status}`);
  }

  // Booking endpoints
  async getBookings(filters = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'all') {
        queryParams.append(key, value);
      }
    });
    
    const queryString = queryParams.toString();
    const endpoint = queryString ? `/bookings?${queryString}` : '/bookings';
    return this.request(endpoint);
  }

  async getBooking(id) {
    return this.request(`/bookings/${id}`);
  }

  async createBooking(bookingData) {
    return this.request('/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
  }

  async updateBooking(id, bookingData) {
    return this.request(`/bookings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(bookingData),
    });
  }

  async updateBookingDetails(id, bookingData) {
    return this.request(`/bookings/${id}/details`, {
      method: 'PUT',
      body: JSON.stringify(bookingData),
    });
  }

  async verifyBooking(id) {
    return this.request(`/bookings/${id}/verify`, {
      method: 'POST',
    });
  }

  async deleteBooking(id) {
    return this.request(`/bookings/${id}`, {
      method: 'DELETE',
    });
  }

  async getBookingsByDateRange(startDate, endDate) {
    return this.request(`/bookings/range/${startDate}/${endDate}`);
  }

  async getBookingsByFacility(facilityId) {
    return this.request(`/bookings/facility/${facilityId}`);
  }

  // User endpoints
  async getUsers(filters = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value);
      }
    });
    
    const queryString = queryParams.toString();
    const endpoint = queryString ? `/users?${queryString}` : '/users';
    return this.request(endpoint);
  }

  async getUser(id) {
    return this.request(`/users/${id}`);
  }

  async createUser(userData) {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUser(id, userData) {
    return this.request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(id) {
    return this.request(`/users/${id}`, {
      method: 'DELETE',
    });
  }

  async updateUserPreferences(id, preferences) {
    return this.request(`/users/${id}/preferences`, {
      method: 'PATCH',
      body: JSON.stringify(preferences),
    });
  }

  async getUsersByRole(role) {
    return this.request(`/users/role/${role}`);
  }

  // Authentication endpoints
  async login(credentials) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async verifyToken() {
    return this.request('/auth/verify');
  }

  async refreshToken() {
    return this.request('/auth/refresh');
  }

  // Utility methods
  async checkApiHealth() {
    try {
      const response = await fetch(`${API_BASE_URL.replace('/api', '')}/health`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

const apiService = new ApiService();
export default apiService;
