const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

class ApiService {
  // Generic request method
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
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

export default new ApiService();
