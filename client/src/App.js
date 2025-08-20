/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Calendar, MapPin, Users, Clock, ChevronRight, Grid, List, Plus, Search, Map, User, Settings, LogOut, Home, X, Edit2, Trash2, Eye, Table2, ChevronLeft } from 'lucide-react';
import api from './services/api';
import { useAuth, AuthProvider } from './contexts/AuthContext';
import Login from './components/Login';
import Register from './components/Register';
import MapView from './components/MapView';
import FloorPlanView from './components/FloorPlanView';

const AppContent = () => {
  const { user, isAdmin, isCollaborator, canBook, canManageUsers, canManageFacilities, canViewReports, canEditBooking, canDeleteBooking, logout, login, register, loading: authLoading, error: authError, setError: setAuthError } = useAuth();
  
  const [currentView, setCurrentView] = useState('dashboard');
  const [viewMode, setViewMode] = useState('list');
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [bookingForm, setBookingForm] = useState({
    facility: '',
    date: new Date().toISOString().split('T')[0], // Default to today
    startTime: '09:00',
    endTime: '10:00',
    purpose: '',
    recurring: 'none'
  });
  const purposeInputRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [facilities, setFacilities] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  // Users page filters
  const [userVerifiedFilter, setUserVerifiedFilter] = useState('all'); // all | verified | unverified
  const [userActiveFilter, setUserActiveFilter] = useState('all'); // all | active | blocked
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserBookings, setShowUserBookings] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState(null);
  const [showAuth, setShowAuth] = useState('login'); // 'login' or 'register'
  const [showFacilityModal, setShowFacilityModal] = useState(false);
  const [editingFacility, setEditingFacility] = useState(null);
  const [facilityForm, setFacilityForm] = useState({
    name: '',
    status: 'open',
    equipmentList: [''],
    openingHoursGrid: generateDefaultOpeningGrid()
  });

  const timeSlots = useMemo(() => [
    '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
    '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
    '18:00', '19:00', '20:00', '21:00', '22:00'
  ], []);

  // Utility to build a default opening-hours grid (07:00-22:00 half-hours)
  function generateDefaultOpeningGrid() {
    return {
      monday: Array(30).fill(true),
      tuesday: Array(30).fill(true),
      wednesday: Array(30).fill(true),
      thursday: Array(30).fill(true),
      friday: Array(30).fill(true),
      saturday: Array(30).fill(true),
      sunday: Array(30).fill(true)
    };
  }

  // Fetch data from API AFTER user is authenticated
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!user) return; // skip until logged in
        setDataLoading(true);
        setDataError(null);
        const [facilitiesData, bookingsData, usersData] = await Promise.all([
          api.getFacilities(),
          api.getBookings(),
          api.getUsers()
        ]);
        setFacilities(facilitiesData);
        setBookings(bookingsData);
        setUsers(usersData);
      } catch (err) {
        console.error('Error fetching data:', err);
        setDataError('Failed to load data. Please check if the backend is running.');
      } finally {
        setDataLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Focus purpose input when modal opens
  useEffect(() => {
    if (showBookingModal && purposeInputRef.current) {
      setTimeout(() => {
        purposeInputRef.current?.focus();
      }, 100);
    }
  }, [showBookingModal]);

  // Refresh data function (requires auth)
  const refreshData = async () => {
    if (!user) return;
    try {
      setDataLoading(true);
      const [facilitiesData, bookingsData, usersData] = await Promise.all([
        api.getFacilities(),
        api.getBookings(),
        api.getUsers()
      ]);
      setFacilities(facilitiesData);
      setBookings(bookingsData);
      setUsers(usersData);
    } catch (err) {
      console.error('Error refreshing data:', err);
    } finally {
      setDataLoading(false);
    }
  };

  // Handle edit booking
  const handleEditBooking = (booking) => {
    setEditingBooking(booking);
    setBookingForm({
      facility: booking.facilityName,
      date: new Date(booking.date).toISOString().split('T')[0],
      startTime: booking.startTime,
      endTime: booking.endTime,
      purpose: booking.purpose,
      recurring: booking.recurring
    });
    setShowBookingModal(true);
  };

  // Handle update booking
  const handleUpdateBooking = async (e) => {
    e.preventDefault();
    try {
      // Find the facility ID from the name
      const facility = facilities.find(f => f.name === bookingForm.facility);
      if (!facility) {
        throw new Error('Facility not found');
      }

      // Update booking data
      const updateData = {
        facility: facility._id,
        facilityName: facility.name,
        date: new Date(bookingForm.date + 'T00:00:00.000Z').toISOString(),
        startTime: bookingForm.startTime,
        endTime: bookingForm.endTime,
        purpose: bookingForm.purpose,
        recurring: bookingForm.recurring
      };

      // Submit update to API
      await api.updateBooking(editingBooking._id, updateData);
      
      // Refresh data to show updated booking
      await refreshData();
      
      // Close modal and reset form
      setShowBookingModal(false);
      setEditingBooking(null);
      setBookingForm({
        facility: '',
        date: '',
        startTime: '',
        endTime: '',
        purpose: '',
        recurring: 'none'
      });
      
      console.log('Booking updated successfully!');
    } catch (error) {
      console.error('Error updating booking:', error);
      alert('Failed to update booking: ' + error.message);
    }
  };

  // Handle delete booking
  const handleDeleteBooking = async (bookingId) => {
    if (window.confirm('Are you sure you want to delete this booking?')) {
      try {
        await api.deleteBooking(bookingId);
        await refreshData();
        console.log('Booking deleted successfully!');
      } catch (error) {
        console.error('Error deleting booking:', error);
        alert('Failed to delete booking: ' + error.message);
      }
    }
  };

  // Handle form field changes - use callback to prevent unnecessary re-renders
  const handleFormChange = useCallback((field, value) => {
    setBookingForm(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    try {
      // Find the facility ID from the name
      const facility = facilities.find(f => f.name === bookingForm.facility);
      if (!facility) {
        throw new Error('Facility not found');
      }

      // Create booking data for API
      const bookingData = {
        facility: facility._id,
        facilityName: facility.name,
        date: new Date(bookingForm.date + 'T00:00:00.000Z').toISOString(),
        startTime: bookingForm.startTime,
        endTime: bookingForm.endTime,
        user: user._id,
        userName: `${user.firstName} ${user.lastName}`,
        purpose: bookingForm.purpose,
        recurring: bookingForm.recurring,
        status: 'confirmed',
        notes: '',
        totalCost: 0
      };

      // Debug: Log the booking data being sent
      console.log('Sending booking data:', bookingData);
      
      // Submit booking to API
      await api.createBooking(bookingData);
      
      // Refresh data to show new booking
      await refreshData();
      
      // Close modal and reset form
      setShowBookingModal(false);
      setBookingForm({
        facility: '',
        date: new Date().toISOString().split('T')[0], // Default to today
        startTime: '09:00',
        endTime: '10:00',
        purpose: '',
        recurring: 'none'
      });
      
      // Show success message (you can add a toast notification here)
      console.log('Booking created successfully!');
    } catch (error) {
      console.error('Error creating booking:', error);
      // Better error handling
      let errorMessage = 'Failed to create booking';
      if (error.response) {
        try {
          const errorData = await error.response.json();
          errorMessage += ': ' + (errorData.message || errorData.error || 'Unknown error');
        } catch (e) {
          errorMessage += ': ' + error.response.statusText;
        }
      } else if (error.message) {
        errorMessage += ': ' + error.message;
      }
      alert(errorMessage);
    }
  };

  // Facility CRUD helpers
  const openCreateFacility = () => {
    setEditingFacility(null);
    setFacilityForm({
      name: '',
      status: 'open',
      equipmentList: [''],
      openingHoursGrid: generateDefaultOpeningGrid()
    });
    setShowFacilityModal(true);
  };

  const openEditFacility = (facility) => {
    setEditingFacility(facility);
    setFacilityForm({
      name: facility.name || '',
      // Normalize legacy statuses coming from older seed data
      status: (facility.status === 'available' ? 'open' : facility.status) || 'open',
      equipmentList: Array.isArray(facility.equipment) && facility.equipment.length > 0 ? facility.equipment : [''],
      openingHoursGrid: facility.openingHoursGrid || generateDefaultOpeningGrid()
    });
    setShowFacilityModal(true);
  };

  const handleFacilityChange = (field, value) => {
    setFacilityForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveFacility = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: facilityForm.name.trim(),
        status: facilityForm.status,
        equipment: facilityForm.equipmentList.map(e => (e || '').trim()).filter(Boolean),
        openingHoursGrid: facilityForm.openingHoursGrid
      };

      if (editingFacility) {
        await api.updateFacility(editingFacility._id, payload);
      } else {
        await api.createFacility(payload);
      }
      await refreshData();
      setShowFacilityModal(false);
      setEditingFacility(null);
    } catch (error) {
      console.error('Error saving facility:', error);
      alert('Failed to save facility: ' + (error.message || 'Unknown error'));
    }
  };

  const handleDeleteFacility = async (facilityId) => {
    if (!window.confirm('Are you sure you want to delete this facility?')) return;
    try {
      await api.deleteFacility(facilityId);
      await refreshData();
    } catch (error) {
      console.error('Error deleting facility:', error);
      alert('Failed to delete facility: ' + (error.message || 'Unknown error'));
    }
  };

  // Admin user management actions
  const handleUnverifyUser = async (userId) => {
    if (!canManageUsers()) return;
    const target = users.find(u => u._id === userId);
    if (target?.role === 'admin') return;
    try {
      await api.updateUser(userId, { verified: false });
      await refreshData();
    } catch (error) {
      console.error('Error unverifying user:', error);
      alert('Failed to unverify user: ' + (error.message || 'Unknown error'));
    }
  };

  const handleVerifyUser = async (userId) => {
    if (!canManageUsers()) return;
    const target = users.find(u => u._id === userId);
    if (target?.role === 'admin') return;
    try {
      await api.updateUser(userId, { verified: true });
      await refreshData();
    } catch (error) {
      console.error('Error verifying user:', error);
      alert('Failed to verify user: ' + (error.message || 'Unknown error'));
    }
  };

  const handleDeactivateUser = async (userId) => {
    if (!canManageUsers()) return;
    const target = users.find(u => u._id === userId);
    if (target?.role === 'admin') return;
    if (!window.confirm('Block this user? They will no longer be able to sign in.')) return;
    try {
      await api.deleteUser(userId);
      await refreshData();
    } catch (error) {
      console.error('Error deactivating user:', error);
      alert('Failed to block user: ' + (error.message || 'Unknown error'));
    }
  };

  const handleReactivateUser = async (userId) => {
    if (!canManageUsers()) return;
    const target = users.find(u => u._id === userId);
    if (target?.role === 'admin') return;
    try {
      await api.updateUser(userId, { isActive: true });
      await refreshData();
    } catch (error) {
      console.error('Error reactivating user:', error);
      alert('Failed to unblock user: ' + (error.message || 'Unknown error'));
    }
  };

  const openUserBookings = (u) => {
    setSelectedUser(u);
    setShowUserBookings(true);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'open': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-red-100 text-red-800';
      case 'available': return 'bg-green-100 text-green-800';
      case 'booked': return 'bg-amber-100 text-amber-800';
      case 'maintenance': return 'bg-red-100 text-red-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Helper functions for timetable
  const getWeekDates = (date) => {
    const week = [];
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      week.push(day);
    }
    return week;
  };

  const getWeekRange = (date) => {
    const weekDates = getWeekDates(date);
    const start = weekDates[0];
    const end = weekDates[6];
    const startMonth = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endMonth = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${startMonth} - ${endMonth}`;
  };

  const formatDateForComparison = (date) => {
    return date.toISOString().split('T')[0];
  };

  const getBookingForSlot = (facility, date, time) => {
    const dateStr = formatDateForComparison(date);
    return bookings.find(booking => {
      const bookingDate = new Date(booking.date).toISOString().split('T')[0];
      return booking.facilityName === facility.name && 
             bookingDate === dateStr && 
             booking.startTime === time;
    });
  };

  // Determine if a booking is in the past (based on booking end time on its date)
  const isBookingPast = (booking) => {
    try {
      const endDateTime = new Date(booking.date);
      const [hh, mm] = String(booking.endTime || '00:00').split(':').map(Number);
      endDateTime.setHours(hh || 0, mm || 0, 0, 0);
      return endDateTime < new Date();
    } catch (e) {
      return false;
    }
  };

  // Limit visibility by role:
  // - Admin: all bookings
  // - Collaborator: only their own past bookings
  const baseBookings = isAdmin() ? bookings : bookings.filter(b => b.user === user?._id && isBookingPast(b));

  const filteredBookings = baseBookings.filter(booking => {
    const matchesSearch = booking.facilityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          booking.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          booking.purpose.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || booking.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  // Helpers for privacy masking in timetable for collaborators
  const shouldMaskBooking = (booking) => {
    return !isAdmin() && booking.user !== user?._id;
  };

  const getMaskedTitle = (booking) => {
    const base = `${booking.startTime}-${booking.endTime}`;
    return shouldMaskBooking(booking)
      ? `${base} • Booked by ${booking.userName}`
      : `${base} • ${booking.userName}${booking.purpose ? ` • ${booking.purpose}` : ''}`;
  };

  // Reusable component to render half-hour opening grid
  const OpeningHoursGrid = ({ grid, onToggle, readOnly = false }) => {
    const scrollRef = useRef(null);
    const days = [
      { key: 'monday', label: 'Mon' },
      { key: 'tuesday', label: 'Tue' },
      { key: 'wednesday', label: 'Wed' },
      { key: 'thursday', label: 'Thu' },
      { key: 'friday', label: 'Fri' },
      { key: 'saturday', label: 'Sat' },
      { key: 'sunday', label: 'Sun' },
    ];
    const slots = Array.from({ length: 30 }, (_, i) => {
      const hour = 7 + Math.floor(i / 2);
      const minute = i % 2 === 0 ? '00' : '30';
      return `${String(hour).padStart(2, '0')}:${minute}`;
    });

    return (
      <div ref={scrollRef} className="bg-gray-50 rounded-lg p-3 max-h-96 overflow-y-auto overflow-x-hidden">
        <div>
          <div className="grid grid-cols-8 gap-2 text-xs mb-2">
            <div className="font-medium text-gray-700">Time</div>
            {days.map(d => (
              <div key={d.key} className="font-medium text-gray-700 text-center">{d.label}</div>
            ))}
          </div>
          {slots.map((label, slotIdx) => (
            <div key={label} className="grid grid-cols-8 gap-2 items-center mb-1">
              <div className="text-gray-600 w-16">{label}</div>
              {days.map(d => {
                const isOpen = grid?.[d.key]?.[slotIdx] !== false;
                const common = `h-8 rounded transition-colors ${isOpen ? 'bg-green-200' : 'bg-red-200'}`;
                if (readOnly) {
                  return <div key={`${d.key}-${slotIdx}`} className={common}></div>;
                }
                return (
                  <button
                    key={`${d.key}-${slotIdx}`}
                    type="button"
                    className={common}
                    onClick={() => {
                      const currentScroll = scrollRef.current ? scrollRef.current.scrollTop : 0;
                      onToggle && onToggle(d.key, slotIdx);
                      // Restore scroll after state update
                      setTimeout(() => {
                        if (scrollRef.current) {
                          scrollRef.current.scrollTop = currentScroll;
                        }
                      }, 0);
                    }}
                    title={`${d.label} ${label} ${isOpen ? 'Open' : 'Closed'}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const Sidebar = () => (
    <div className="w-64 bg-gray-900 text-white h-screen fixed left-0 top-0 overflow-y-auto">
      <div className="p-6">
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <Home className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">TSG Heilbronn</h1>
            <p className="text-xs text-gray-400">Hall Management</p>
          </div>
        </div>
        
        <nav className="space-y-1">
          <button
            onClick={() => setCurrentView('dashboard')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
              currentView === 'dashboard' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            <Grid className="w-5 h-5" />
            <span>Dashboard</span>
          </button>
          
          <button
            onClick={() => setCurrentView('bookings')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
              currentView === 'bookings' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            <Calendar className="w-5 h-5" />
            <span>Bookings</span>
          </button>
          
          <button
            onClick={() => setCurrentView('timetable')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
              currentView === 'timetable' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            <Table2 className="w-5 h-5" />
            <span>Timetable</span>
          </button>
          
          <button
            onClick={() => setCurrentView('facilities')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
              currentView === 'facilities' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            <MapPin className="w-5 h-5" />
            <span>Facilities</span>
          </button>
          
                        {canManageUsers() && (
            <>
              <button
                onClick={() => setCurrentView('users')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  currentView === 'users' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <Users className="w-5 h-5" />
                <span>Users</span>
              </button>
              
              <button
                onClick={() => setCurrentView('reports')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  currentView === 'reports' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <Settings className="w-5 h-5" />
                <span>Reports</span>
              </button>

            </>
          )}
          
          <button
            onClick={() => setCurrentView('map')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
              currentView === 'map' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            <Map className="w-5 h-5" />
            <span>Map View</span>
          </button>
        </nav>
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-800">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-gray-400">{isAdmin() ? 'Administrator' : 'Collaborator'}</p>
          </div>
        </div>
        <button 
  type="button"
  onClick={() => { 
    logout(); 
      }}
      className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
    >
      <LogOut className="w-4 h-4" />
      <span className="text-sm">Logout</span>
    </button>
      </div>
    </div>
  );

  const Header = () => (
    <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <h2 className="text-2xl font-bold text-gray-900">
          {currentView === 'dashboard' && 'Dashboard'}
          {currentView === 'bookings' && 'Bookings Management'}
          {currentView === 'timetable' && 'Weekly Timetable'}
          {currentView === 'facilities' && 'Facilities Overview'}
          {currentView === 'users' && 'User Management'}
          {currentView === 'reports' && 'Reports & Analytics'}
        </h2>
      </div>
      
      <div className="flex items-center space-x-4">
        {currentView === 'facilities' && canManageFacilities() && (
          <button
            onClick={openCreateFacility}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Facility</span>
          </button>
        )}
        {currentView === 'timetable' && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                const newDate = new Date(selectedWeek);
                newDate.setDate(newDate.getDate() - 7);
                setSelectedWeek(newDate);
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium px-3">
              {getWeekRange(selectedWeek)}
            </span>
            <button
              onClick={() => {
                const newDate = new Date(selectedWeek);
                newDate.setDate(newDate.getDate() + 7);
                setSelectedWeek(newDate);
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setSelectedWeek(new Date())}
              className="ml-2 px-3 py-1 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Today
            </button>
          </div>
        )}
        
        {(currentView === 'bookings' || currentView === 'facilities') && (
          <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>
        )}
        
        <button
          onClick={() => setShowBookingModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Booking</span>
        </button>
      </div>
    </div>
  );

  const DashboardView = () => (
    <div className="p-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <MapPin className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-xs text-gray-500">Total</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{facilities.length}</h3>
          <p className="text-sm text-gray-600">Facilities</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-xs text-gray-500">Today</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{bookings.filter(b => {
            const today = new Date().toISOString().split('T')[0];
            const bookingDate = new Date(b.date).toISOString().split('T')[0];
            return bookingDate === today;
          }).length}</h3>
          <p className="text-sm text-gray-600">Bookings</p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Today's Schedule</h3>
            <button
              onClick={refreshData}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh data"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
          <div className="p-6 space-y-4">
            {bookings.filter(b => {
              const today = new Date().toISOString().split('T')[0];
              const bookingDate = new Date(b.date).toISOString().split('T')[0];
              return bookingDate === today;
            }).map(booking => (
              <div key={booking._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-2 h-12 bg-blue-600 rounded-full"></div>
                  <div>
                    <p className="font-medium text-gray-900">{booking.facilityName}</p>
                    <p className="text-sm text-gray-600">{booking.startTime}-{booking.endTime} • {booking.userName}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                  {booking.status}
                </span>
              </div>
            ))}
            {bookings.filter(b => {
              const today = new Date().toISOString().split('T')[0];
              const bookingDate = new Date(b.date).toISOString().split('T')[0];
              return bookingDate === today;
            }).length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No bookings scheduled for today</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Facility Status</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4">
              {facilities.slice(0, 4).map(facility => (
                <div key={facility._id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900 text-sm">{facility.name}</h4>
                    <div className={`w-3 h-3 rounded-full ${
                      facility.status === 'open' ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                  </div>
                  <p className="text-xs text-gray-600 capitalize">{facility.status}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const BookingsView = () => (
    <div className="p-8">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search bookings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="confirmed">Confirmed</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>
        </div>
        
        {viewMode === 'list' ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left p-4 font-medium text-gray-700">Facility</th>
                  <th className="text-left p-4 font-medium text-gray-700">Date</th>
                  <th className="text-left p-4 font-medium text-gray-700">Time</th>
                  <th className="text-left p-4 font-medium text-gray-700">User</th>
                  <th className="text-left p-4 font-medium text-gray-700">Purpose</th>
                  <th className="text-left p-4 font-medium text-gray-700">Status</th>
                  <th className="text-left p-4 font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map(booking => (
                  <tr key={booking._id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-4 font-medium">{booking.facilityName}</td>
                    <td className="p-4">{new Date(booking.date).toLocaleDateString()}</td>
                    <td className="p-4">{booking.startTime}-{booking.endTime}</td>
                    <td className="p-4">{booking.userName}</td>
                    <td className="p-4">{booking.purpose}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                        {booking.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        <button className="p-1 hover:bg-gray-100 rounded">
                          <Eye className="w-4 h-4 text-gray-600" />
                        </button>
                        {(isAdmin() || canEditBooking(booking)) && (
                          <>
                                                    <button 
                          onClick={() => handleEditBooking(booking)}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <Edit2 className="w-4 h-4 text-gray-600" />
                        </button>
                            <button 
                              onClick={() => handleDeleteBooking(booking._id)}
                              className="p-1 hover:bg-gray-100 rounded"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBookings.map(booking => (
              <div key={booking._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <h4 className="font-semibold text-gray-900">{booking.facilityName}</h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                    {booking.status}
                  </span>
                </div>
                <div className="space-y-2 text-sm text-gray-600">
                  <p className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    {new Date(booking.date).toLocaleDateString()}
                  </p>
                  <p className="flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    {booking.startTime}-{booking.endTime}
                  </p>
                  <p className="flex items-center">
                    <User className="w-4 h-4 mr-2" />
                    {booking.userName}
                  </p>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-700 font-medium">{booking.purpose}</p>
                </div>
                                        {(isAdmin() || canEditBooking(booking)) && (
                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-end space-x-2">
                    <button 
                      onClick={() => handleEditBooking(booking)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Edit booking"
                    >
                      <Edit2 className="w-4 h-4 text-gray-600" />
                    </button>
                    <button 
                      onClick={() => handleDeleteBooking(booking._id)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Delete booking"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const FacilitiesView = () => (
    <div className="p-8">
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {facilities.map(facility => (
            <div key={facility._id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
              <div className="h-32 bg-gradient-to-br from-blue-500 to-blue-600 relative">
                <div className="absolute top-4 right-4">
                  <div className={`w-3 h-3 rounded-full ${
                    facility.status === 'open' ? 'bg-green-400' : 'bg-red-400'
                  } ring-2 ring-white`}></div>
                </div>
                <div className="absolute bottom-4 left-4 text-white">
                  <h3 className="text-lg font-semibold">{facility.name}</h3>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Status</p>
                    <p className="font-medium text-gray-900 capitalize">{facility.status}</p>
                  </div>
                </div>
                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-2">Equipment</p>
                  <div className="flex flex-wrap gap-2">
                    {facility.equipment.map((item, index) => (
                      <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => setSelectedFacility(facility)}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    View Details
                  </button>
                  {canManageFacilities() && (
                    <>
                      <button
                        onClick={() => openEditFacility(facility)}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteFacility(facility._id)}
                        className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left p-4 font-medium text-gray-700">Facility Name</th>
                  <th className="text-left p-4 font-medium text-gray-700">Status</th>
                  <th className="text-left p-4 font-medium text-gray-700">Equipment</th>
                  <th className="text-left p-4 font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {facilities.map(facility => (
                  <tr key={facility._id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-4 font-medium">{facility.name}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(facility.status)}`}>
                        {facility.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {facility.equipment.slice(0, 2).map((item, index) => (
                          <span key={index} className="text-xs text-gray-600">
                            {item}{index < 1 && facility.equipment.length > 1 ? ',' : ''}
                          </span>
                        ))}
                        {facility.equipment.length > 2 && (
                          <span className="text-xs text-gray-400">+{facility.equipment.length - 2} more</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedFacility(facility)}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          View Details
                        </button>
                        {canManageFacilities() && (
                          <>
                            <button
                              onClick={() => openEditFacility(facility)}
                              className="text-gray-700 hover:text-gray-900 text-sm font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteFacility(facility._id)}
                              className="text-red-600 hover:text-red-700 text-sm font-medium"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  const TimetableView = () => {
    const weekDates = getWeekDates(selectedWeek);
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const [facilityFilter, setFacilityFilter] = useState('all');
    const visibleFacilities = useMemo(
      () => (facilityFilter === 'all' ? facilities : facilities.filter(f => f._id === facilityFilter)),
      [facilityFilter, facilities]
    );
    
    // Helper function to get all bookings for a facility on a specific date
    const getBookingsForFacilityAndDate = (facility, date) => {
      const dateStr = formatDateForComparison(date);
      return bookings.filter(booking => {
        const bookingDate = new Date(booking.date).toISOString().split('T')[0];
        return booking.facilityName === facility.name && bookingDate === dateStr;
      }).sort((a, b) => a.startTime.localeCompare(b.startTime));
    };

    // Rows should auto-grow based on content; enforce only a minimum height per cell
    const MIN_CELL_HEIGHT_CLASS = 'min-h-16';
    // Helpers for single-facility timeline layout
    const startOfDayMin = 6 * 60; // 06:00
    const endOfDayMin = 22 * 60; // 22:00
    const hourHeightPx = 48; // px per hour in the timeline
    const totalHours = (endOfDayMin - startOfDayMin) / 60; // 16 hours
    const hours = Array.from({ length: totalHours + 1 }, (_, i) => 6 + i); // 06..22 labels
    const parseTimeToMinutes = (t) => {
      const [hh, mm] = (t || '00:00').split(':').map(Number);
      return (hh || 0) * 60 + (mm || 0);
    };
    const computeBlockStyle = (startTime, endTime) => {
      const s = Math.max(parseTimeToMinutes(startTime), startOfDayMin);
      const e = Math.min(parseTimeToMinutes(endTime), endOfDayMin);
      const top = ((s - startOfDayMin) / 60) * hourHeightPx;
      const height = Math.max(20, ((e - s) / 60) * hourHeightPx - 2);
      return { top: `${top}px`, height: `${height}px` };
    };
    
    return (
      <div className="p-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Weekly Timetable</h3>
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">Facility:</label>
            <select
              value={facilityFilter}
              onChange={(e) => setFacilityFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Facilities</option>
              {facilities.map((f) => (
                <option key={f._id} value={f._id}>{f.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {facilityFilter !== 'all' ? (
            <div className="overflow-x-auto">
              <div className="min-w-[1000px] p-4">
                <div className="grid grid-cols-8 gap-0 border-b border-gray-200 mb-2">
                  <div className="p-2 font-medium text-gray-700 bg-gray-50">Time</div>
                  {dayNames.map((d, i) => (
                    <div key={d} className="p-2 text-center font-medium text-gray-700 bg-gray-50">
                      <div>{d}</div>
                      <div className="text-xs text-gray-500">{weekDates[i].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-8 gap-0">
                  {/* Time Axis */}
                  <div className="relative border-r border-gray-200 bg-gray-50" style={{ height: `${totalHours * hourHeightPx}px` }}>
                    {hours.map((h, idx) => (
                      <div key={h} className="absolute left-0 right-0 text-xs text-gray-500 pr-2" style={{ top: `${idx * hourHeightPx - 6}px` }}>
                        <div className="flex items-center justify-end h-0">
                          <span>{String(h).padStart(2, '0')}:00</span>
                        </div>
                        <div className="border-t border-gray-200 absolute left-0 right-0" style={{ top: '6px' }}></div>
                      </div>
                    ))}
                  </div>
                  {/* Day Columns */}
                  {weekDates.map((date, i) => {
                    const sel = facilities.find(f => f._id === facilityFilter);
                    const dayBookings = sel ? getBookingsForFacilityAndDate(sel, date) : [];
                    return (
                      <div key={i} className="relative border-r last:border-r-0 border-gray-200" style={{ height: `${totalHours * hourHeightPx}px` }}>
                        {hours.map((h, idx) => (
                          <div key={h} className="absolute left-0 right-0 border-t border-gray-100" style={{ top: `${idx * hourHeightPx}px` }}></div>
                        ))}
                        {dayBookings.map((b) => {
                          const style = computeBlockStyle(b.startTime, b.endTime);
                          const isConfirmed = b.status === 'confirmed';
                          const masked = shouldMaskBooking(b);
                          return (
                            <div
                              key={b._id}
                              className={`absolute left-1 right-1 rounded-md px-2 py-1 shadow-sm overflow-hidden ${isConfirmed ? 'bg-blue-500 text-white' : 'bg-amber-500 text-white'}`}
                              style={style}
                              title={getMaskedTitle(b)}
                            >
                              <div className="text-[10px] opacity-90">{b.startTime}-{b.endTime}</div>
                              <div className="text-xs font-medium truncate">{masked ? 'Booked' : (b.purpose || b.userName)}</div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[1400px]">
                {/* Header with days */}
                <div className="grid grid-cols-8 border-b border-gray-200 bg-gray-50">
                  <div className="p-4 font-medium text-gray-700 border-r border-gray-200">
                    <div className="text-lg font-semibold">Facilities</div>
                    <div className="text-sm text-gray-500 mt-1">Click + to book</div>
                  </div>
                  {weekDates.map((date, index) => (
                    <div key={index} className="p-4 text-center border-r border-gray-200 last:border-r-0">
                      <div className="font-medium text-gray-900">{dayNames[index]}</div>
                      <div className="text-sm text-gray-600">
                        {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                      {formatDateForComparison(date) === formatDateForComparison(new Date()) && (
                        <div className="mt-1 inline-block px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                          Today
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Time slots and facilities */}
                {visibleFacilities.map((facility, facilityIndex) => (
                  <div key={facility._id} className={`${facilityIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <div className="grid grid-cols-8 border-b border-gray-200">
                      <div className="p-4 font-medium text-gray-900 border-r border-gray-200 bg-gray-50">
                        <div className="text-lg font-semibold">{facility.name}</div>
                        <div className="text-sm text-gray-500 mt-1 capitalize">Status: {facility.status}</div>
                      </div>
                      
                      {weekDates.map((date, dateIndex) => {
                        const dayBookings = getBookingsForFacilityAndDate(facility, date);
                        const isToday = formatDateForComparison(date) === formatDateForComparison(new Date());
                        
                        return (
                          <div 
                            key={dateIndex} 
                            className={`border-r border-gray-200 last:border-r-0 relative ${MIN_CELL_HEIGHT_CLASS} ${
                              isToday ? 'bg-blue-50 bg-opacity-30' : ''
                            }`}
                          >
                            {dayBookings.length === 0 ? (
                              // Empty day - show "No events" message
                              <div className="h-full flex flex-col items-center justify-center p-2">
                                <div className="text-center">
                                  <div className="text-gray-400 text-xs mb-2">No events</div>
                                  <button
                                    onClick={() => {
                                      setBookingForm({
                                        ...bookingForm,
                                        facility: facility.name,
                                        date: formatDateForComparison(date),
                                        startTime: '09:00',
                                        endTime: '10:00'
                                      });
                                      setShowBookingModal(true);
                                    }}
                                    className="w-8 h-8 bg-green-100 hover:bg-green-200 rounded-full transition-colors flex items-center justify-center text-green-600 hover:text-green-700"
                                    title="Add booking"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              // Day with bookings
                              <div className="h-full p-2 space-y-1">
                                {dayBookings.map((booking, bookingIndex) => {
                                  const masked = shouldMaskBooking(booking);
                                  return (
                                    <div
                                      key={booking._id}
                                      className={`rounded-lg p-2 cursor-pointer hover:opacity-90 transition-all transform hover:scale-105 ${
                                        booking.status === 'confirmed' 
                                          ? 'bg-blue-500 text-white shadow-md' : 'bg-amber-500 text-white shadow-md'
                                      }`}
                                      title={getMaskedTitle(booking)}
                                    >
                                      <div className="font-medium text-xs truncate">
                                        {booking.startTime}-{booking.endTime}
                                      </div>
                                      <div className="text-xs opacity-90 truncate">
                                        {masked ? 'Booked' : booking.userName}
                                      </div>
                                      {!masked && booking.purpose && (
                                        <div className="text-xs opacity-75 truncate mt-1">
                                          {booking.purpose}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                                
                                {/* Add booking button for days with existing bookings */}
                                <button
                                  onClick={() => {
                                    setBookingForm({
                                      ...bookingForm,
                                      facility: facility.name,
                                      date: formatDateForComparison(date),
                                      startTime: '09:00',
                                      endTime: '10:00'
                                    });
                                    setShowBookingModal(true);
                                  }}
                                  className="w-6 h-6 bg-green-100 hover:bg-green-200 rounded-full transition-colors flex items-center justify-center text-green-600 hover:text-green-700 mt-1"
                                  title="Add another booking"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                
                {/* Legend */}
                <div className="p-4 bg-gray-50 border-t border-gray-200">
                  <div className="flex items-center space-x-6 text-sm">
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-blue-500 rounded shadow-sm"></div>
                      <span className="text-gray-600">Confirmed Booking</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-amber-500 rounded shadow-sm"></div>
                      <span className="text-gray-600">Pending Booking</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-green-100 rounded shadow-sm"></div>
                      <span className="text-gray-600">Available Slot</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-blue-50 rounded shadow-sm"></div>
                      <span className="text-gray-600">Today</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">This Week</p>
                <p className="text-2xl font-bold text-gray-900">
                  {bookings.filter(b => {
                    const bookingDate = new Date(b.date);
                    return weekDates.some(weekDate => 
                      formatDateForComparison(weekDate) === formatDateForComparison(bookingDate)
                    );
                  }).length}
                </p>
                <p className="text-xs text-gray-500">Total Bookings</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Available</p>
                <p className="text-2xl font-bold text-green-600">
                  {facilities.filter(f => f.status === 'open').length}
                </p>
                <p className="text-xs text-gray-500">Facilities Now</p>
              </div>
              <MapPin className="w-8 h-8 text-green-500" />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const BookingModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-gray-900">
              {editingBooking ? 'Edit Booking' : 'Create New Booking'}
            </h3>
            <button
              onClick={() => {
                setShowBookingModal(false);
                setEditingBooking(null);
                setBookingForm({
                  facility: '',
                  date: new Date().toISOString().split('T')[0], // Default to today
                  startTime: '09:00',
                  endTime: '10:00',
                  purpose: '',
                  recurring: 'none'
                });
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>
        
        <form 
          onSubmit={editingBooking ? handleUpdateBooking : handleBookingSubmit} 
          className="p-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Facility</label>
              <select
                value={bookingForm.facility}
                onChange={(e) => handleFormChange('facility', e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select a facility</option>
                {facilities.filter(f => f.status === 'open').map(facility => (
                  <option key={facility._id} value={facility.name}>{facility.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
              <input
                type="date"
                value={bookingForm.date}
                onChange={(e) => handleFormChange('date', e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
              <select
                value={bookingForm.startTime}
                onChange={(e) => handleFormChange('startTime', e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select start time</option>
                {timeSlots.map(time => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
              <select
                value={bookingForm.endTime}
                onChange={(e) => handleFormChange('endTime', e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select end time</option>
                {timeSlots.map(time => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Purpose</label>
            <input
              ref={purposeInputRef}
              type="text"
              value={bookingForm.purpose}
              onChange={(e) => handleFormChange('purpose', e.target.value)}
              placeholder="e.g., Basketball Training, Team Meeting"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Recurring Booking</label>
            <select
              value={bookingForm.recurring}
              onChange={(e) => handleFormChange('recurring', e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="none">No Recurrence</option>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Bi-weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          
          <div className="flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                setShowBookingModal(false);
                setEditingBooking(null);
                setBookingForm({
                  facility: '',
                  date: new Date().toISOString().split('T')[0], // Default to today
                  startTime: '09:00',
                  endTime: '10:00',
                  purpose: '',
                  recurring: 'none'
                });
              }}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {editingBooking ? 'Update Booking' : 'Create Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const FacilityDetailModal = () => (
    selectedFacility && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">{selectedFacility.name}</h3>
              <button
                onClick={() => setSelectedFacility(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Facility Information</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Status</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedFacility.status)}`}>
                      {selectedFacility.status}
                    </span>
                  </div>
                  
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Available Equipment</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedFacility.equipment.map((item, index) => (
                    <span key={index} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Weekly Schedule</h4>
              <OpeningHoursGrid
                grid={selectedFacility.openingHoursGrid}
                readOnly
              />
            </div>
            
            <div className="mt-6 flex items-center justify-end space-x-3">
              <button
                onClick={() => {
                  setSelectedFacility(null);
                  setShowBookingModal(true);
                  setBookingForm({...bookingForm, facility: selectedFacility.name});
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Book This Facility
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  );

  const UserBookingsModal = () => (
    showUserBookings && selectedUser ? (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[85vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-xl font-semibold text-gray-900">{selectedUser.firstName} {selectedUser.lastName} • Previous Bookings</h3>
            <button
              onClick={() => { setShowUserBookings(false); setSelectedUser(null); }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left p-3 text-sm font-medium text-gray-700">Date</th>
                    <th className="text-left p-3 text-sm font-medium text-gray-700">Facility</th>
                    <th className="text-left p-3 text-sm font-medium text-gray-700">Time</th>
                    <th className="text-left p-3 text-sm font-medium text-gray-700">Purpose</th>
                    <th className="text-left p-3 text-sm font-medium text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings
                    .filter(b => b.user === selectedUser._id)
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .map(b => (
                      <tr key={b._id} className="border-b border-gray-100">
                        <td className="p-3 text-sm">{new Date(b.date).toLocaleDateString()}</td>
                        <td className="p-3 text-sm">{b.facilityName}</td>
                        <td className="p-3 text-sm">{b.startTime}-{b.endTime}</td>
                        <td className="p-3 text-sm">{b.purpose}</td>
                        <td className="p-3 text-sm">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(b.status)}`}>{b.status}</span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    ) : null
  );

  const FacilityModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-gray-900">
              {editingFacility ? 'Edit Facility' : 'Add New Facility'}
            </h3>
            <button
              onClick={() => { setShowFacilityModal(false); setEditingFacility(null); }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>
        <form onSubmit={handleSaveFacility} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
              <input
                type="text"
                value={facilityForm.name}
                onChange={(e) => handleFacilityChange('name', e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={facilityForm.status}
                onChange={(e) => handleFacilityChange('status', e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4"></div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Equipment</label>
            <div className="space-y-2">
              {facilityForm.equipmentList.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFacilityForm(prev => ({
                        ...prev,
                        equipmentList: prev.equipmentList.map((it, i) => i === idx ? value : it)
                      }));
                    }}
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Projector"
                  />
                  <button
                    type="button"
                    onClick={() => setFacilityForm(prev => ({
                      ...prev,
                      equipmentList: prev.equipmentList.filter((_, i) => i !== idx)
                    }))}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                    aria-label="Remove equipment"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setFacilityForm(prev => ({ ...prev, equipmentList: [...prev.equipmentList, ''] }))}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm"
              >
                + Add Equipment
              </button>
            </div>
          </div>
          <div></div>
          {/* Weekly opening schedule (07:00 - 22:00, 30 half-hour slots) */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Weekly Schedule</h4>
            <OpeningHoursGrid
              grid={facilityForm.openingHoursGrid}
              onToggle={(day, idx) => {
                setFacilityForm(prev => ({
                  ...prev,
                  openingHoursGrid: {
                    ...prev.openingHoursGrid,
                    [day]: prev.openingHoursGrid[day].map((v, i) => i === idx ? !v : v)
                  }
                }));
              }}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setShowFacilityModal(false); setEditingFacility(null); }}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // If not authenticated, show auth screens
  if (!user) {
    return (
      showAuth === 'login' ? (
        <Login
          onLogin={async (formData) => {
            const result = await login(formData);
            if (result?.success) {
              setCurrentView('dashboard');
            }
          }}
          onSwitchToRegister={() => {
            setAuthError(null);
            setShowAuth('register');
          }}
          loading={authLoading}
          error={authError}
        />
      ) : (
        <Register
          onRegister={async (userData) => {
            const result = await register(userData);
            if (result?.success) {
              // After successful registration, switch to login screen
              setAuthError(null);
              setShowAuth('login');
            }
          }}
          onSwitchToLogin={() => {
            setAuthError(null);
            setShowAuth('login');
          }}
          loading={authLoading}
          error={authError}
        />
      )
    );
  }

  // Show loading state for data
  if (dataLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Loading TSG Hallenmanagement...</h2>
          <p className="text-gray-500">Please wait while we fetch your data</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (dataError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Connection Error</h2>
          <p className="text-gray-500 mb-4">{dataError}</p>
          <button
            onClick={refreshData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      
      <div className="ml-64">
        <Header />
        
        {currentView === 'dashboard' && <DashboardView />}
        {currentView === 'bookings' && <BookingsView />}
        {currentView === 'timetable' && <TimetableView />}
        {currentView === 'facilities' && <FacilitiesView />}
        
        {currentView === 'users' && (
          <div className="p-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">All Users</h3>
                <div className="flex items-center gap-3">
                  <div className="text-sm text-gray-500 mr-1">{users.length} total</div>
                  <select
                    value={userVerifiedFilter}
                    onChange={(e) => setUserVerifiedFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    title="Filter by verification"
                  >
                    <option value="all">All</option>
                    <option value="verified">Verified</option>
                    <option value="unverified">Unverified</option>
                  </select>
                  <select
                    value={userActiveFilter}
                    onChange={(e) => setUserActiveFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    title="Filter by status"
                  >
                    <option value="all">All</option>
                    <option value="active">Active</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left p-4 font-medium text-gray-700">Name</th>
                      <th className="text-left p-4 font-medium text-gray-700">Username</th>
                      <th className="text-left p-4 font-medium text-gray-700">Email</th>
                      <th className="text-left p-4 font-medium text-gray-700">Role</th>
                      <th className="text-left p-4 font-medium text-gray-700">Verified</th>
                      <th className="text-left p-4 font-medium text-gray-700">Active</th>
                      <th className="text-left p-4 font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users
                      .filter((u) => userVerifiedFilter === 'all' ? true : userVerifiedFilter === 'verified' ? u.verified : !u.verified)
                      .filter((u) => userActiveFilter === 'all' ? true : userActiveFilter === 'active' ? (u.isActive !== false) : (u.isActive === false))
                      .map((u) => (
                      <tr key={u._id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-4 font-medium">
                          <button
                            className="text-blue-600 hover:underline"
                            onClick={() => openUserBookings(u)}
                            title="View user's bookings"
                          >
                            {u.firstName} {u.lastName}
                          </button>
                        </td>
                        <td className="p-4">{u.username}</td>
                        <td className="p-4">{u.email}</td>
                        <td className="p-4 capitalize">{u.role}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${u.verified ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                            {u.verified ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${u.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {u.isActive !== false ? 'Active' : 'Blocked'}
                          </span>
                        </td>
                        <td className="p-4">
                          {canManageUsers() ? (
                            <div className="flex items-center gap-2">
                              {u.verified && u.role !== 'admin' ? (
                                <button
                                  onClick={() => handleUnverifyUser(u._id)}
                                  className="px-3 py-1 border rounded text-sm border-gray-300 hover:bg-gray-50"
                                  title="Set verified to false"
                                >
                                  Unverify
                                </button>
                              ) : (!u.verified && u.role !== 'admin' ? (
                                <button
                                  onClick={() => handleVerifyUser(u._id)}
                                  className="px-3 py-1 border rounded text-sm border-green-300 text-green-700 hover:bg-green-50"
                                  title="Verify user"
                                >
                                  Verify
                                </button>
                              ) : null)}
                              {u.isActive === false && u.role !== 'admin' ? (
                                <button
                                  onClick={() => handleReactivateUser(u._id)}
                                  className="px-3 py-1 border border-green-300 text-green-700 rounded text-sm hover:bg-green-50"
                                  title="Unblock user"
                                >
                                  Unblock
                                </button>
                              ) : (u.role !== 'admin' ? (
                                <button
                                  onClick={() => handleDeactivateUser(u._id)}
                                  className="px-3 py-1 border border-red-300 text-red-600 rounded text-sm hover:bg-red-50"
                                  title="Block user"
                                >
                                  Block
                                </button>
                              ) : null)}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">No actions</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        
        {currentView === 'reports' && (
          <div className="p-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <Settings className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Reports & Analytics</h3>
              <p className="text-gray-600">View facility usage reports and analytics</p>
            </div>
          </div>
        )}
        
        {currentView === 'map' && (
          <div className="h-screen">
            <MapView 
              facilities={facilities}
              bookings={bookings}
              onFacilityClick={setSelectedFacility}
              onBookingClick={(booking) => console.log(booking)}
              onNewBooking={() => setShowBookingModal(true)}
            />
          </div>
        )}
      </div>
      
      {showBookingModal && <BookingModal />}
      {selectedFacility && <FacilityDetailModal />}
      {showFacilityModal && canManageFacilities() && <FacilityModal />}
      {showUserBookings && <UserBookingsModal />}
    </div>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;