import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is authenticated on app load
  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          // Verify token with backend
          const verifyResponse = await api.verifyToken();
          // verify endpoint returns an object with a `user` field
          setUser(verifyResponse.user);
          setError(null);
        } catch (err) {
          console.error('Token verification failed:', err);
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, [token]);

  // Login function
  const login = async (credentials) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.login(credentials);
      const { token: newToken, user: userData } = response;
      
      // Store token in localStorage
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(userData);
      
      return { success: true };
    } catch (err) {
      console.error('Login error:', err);
      let errorMessage = 'Login failed';
      
      if (err.message) {
        errorMessage = err.message;
      } else if (err.response) {
        errorMessage = 'Server error occurred';
      } else {
        errorMessage = 'Network error - please check your connection';
      }
      
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Register function
  const register = async (userData) => {
    try {
      setLoading(true);
      setError(null);
      
      await api.register(userData);
      return { success: true };
    } catch (err) {
      const errorMessage = err.message || 'Registration failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

// logout function
const logout = () => {
  // Clear token from localStorage first
  localStorage.removeItem('token');
  
  // Clear all auth state
  setToken(null);
  setUser(null);
  setError(null);
  // Do not hard-refresh; App should render auth screens when user is null
};

  // Check if user has specific role
  const hasRole = (role) => {
    return user?.role === role;
  };

  // Check if user is admin
  const isAdmin = () => {
    return user?.role === 'admin';
  };

  // Check if user is collaborator
  const isCollaborator = () => {
    return user?.role === 'collaborator';
  };

  // Check if user is verified (for collaborators)
  const isVerified = () => {
    if (user?.role === 'admin') return true;
    return user?.role === 'collaborator' && user?.verified === true;
  };

  // Check if user can book facilities
  const canBook = () => {
    // Admins can always book; collaborators must be verified and active
    if (isAdmin()) return true;
    return isCollaborator() && user?.verified === true && user?.isActive !== false;
  };

  // Check if user can manage other users
  const canManageUsers = () => {
    return isAdmin();
  };

  // Check if user can manage facilities
  const canManageFacilities = () => {
    return isAdmin();
  };

  // Check if user can view reports
  const canViewReports = () => {
    return isAdmin();
  };

  // Check if user can edit their own bookings
  const canEditBooking = (booking) => {
    if (isAdmin()) return true;
    return isCollaborator() && booking.user === user?._id;
  };

  // Check if user can delete their own bookings
  const canDeleteBooking = (booking) => {
    if (isAdmin()) return true;
    return isCollaborator() && booking.user === user?._id;
  };

  const value = {
    user,
    token,
    loading,
    error,
    login,
    register,
    logout,
    hasRole,
    isAdmin,
    isCollaborator,
    isVerified,
    canBook,
    canManageUsers,
    canManageFacilities,
    canViewReports,
    canEditBooking,
    canDeleteBooking,
    setError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
