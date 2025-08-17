import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Users, Clock, ChevronRight, Grid, List, Plus, Search, Filter, User, Settings, LogOut, Home, ChevronDown, X, Check, Edit2, Trash2, Eye, Table2, ChevronLeft } from 'lucide-react';
import api from './services/api';

const App = () => {
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
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [userRole] = useState('admin'); // Can be 'admin' or 'collaborator'
  const [facilities, setFacilities] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const timeSlots = [
    '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
    '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
    '18:00', '19:00', '20:00', '21:00', '22:00'
  ];

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch facilities, bookings, and users in parallel
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
        setError('Failed to load data. Please check if the backend is running.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Refresh data function
  const refreshData = async () => {
    try {
      setLoading(true);
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
      setLoading(false);
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
        user: '68a1ac66f8c098af61a569c0', // Max Admin user ID from our seeded data
        userName: 'Max Admin', // Max Admin user name
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

  const getStatusColor = (status) => {
    switch(status) {
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

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = booking.facilityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          booking.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          booking.purpose.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || booking.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

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
          
          {userRole === 'admin' && (
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
        </nav>
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-800">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-medium">Max Admin</p>
            <p className="text-xs text-gray-400">{userRole === 'admin' ? 'Administrator' : 'Collaborator'}</p>
          </div>
        </div>
        <button className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
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
        
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <span className="text-xs text-gray-500">Rate</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">73%</h3>
          <p className="text-sm text-gray-600">Utilization</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <span className="text-xs text-gray-500">Active</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">24</h3>
          <p className="text-sm text-gray-600">Users</p>
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
                      facility.status === 'available' ? 'bg-green-500' :
                      facility.status === 'booked' ? 'bg-amber-500' :
                      'bg-red-500'
                    }`}></div>
                  </div>
                  <p className="text-xs text-gray-600">{facility.capacity} people</p>
                  <p className="text-xs text-gray-600">{facility.size}</p>
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
                        {(userRole === 'admin' || booking.userName === 'Max Admin') && (
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
                {(userRole === 'admin' || booking.userName === 'Max Admin') && (
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
                    facility.status === 'available' ? 'bg-green-400' :
                    facility.status === 'booked' ? 'bg-amber-400' :
                    'bg-red-400'
                  } ring-2 ring-white`}></div>
                </div>
                <div className="absolute bottom-4 left-4 text-white">
                  <h3 className="text-lg font-semibold">{facility.name}</h3>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Capacity</p>
                    <p className="font-medium text-gray-900">{facility.capacity} people</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Size</p>
                    <p className="font-medium text-gray-900">{facility.size}</p>
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
                <button
                  onClick={() => setSelectedFacility(facility)}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  View Details
                </button>
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
                  <th className="text-left p-4 font-medium text-gray-700">Capacity</th>
                  <th className="text-left p-4 font-medium text-gray-700">Size</th>
                  <th className="text-left p-4 font-medium text-gray-700">Status</th>
                  <th className="text-left p-4 font-medium text-gray-700">Equipment</th>
                  <th className="text-left p-4 font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {facilities.map(facility => (
                  <tr key={facility._id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-4 font-medium">{facility.name}</td>
                    <td className="p-4">{facility.capacity} people</td>
                    <td className="p-4">{facility.size}</td>
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
                      <button
                        onClick={() => setSelectedFacility(facility)}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        View Details
                      </button>
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
    
    // Helper function to get all bookings for a facility on a specific date
    const getBookingsForFacilityAndDate = (facility, date) => {
      const dateStr = formatDateForComparison(date);
      return bookings.filter(booking => {
        const bookingDate = new Date(booking.date).toISOString().split('T')[0];
        return booking.facilityName === facility.name && bookingDate === dateStr;
      }).sort((a, b) => a.startTime.localeCompare(b.startTime));
    };

    // Helper function to get the height needed for a cell based on bookings
    const getCellHeight = (facility, date) => {
      const dayBookings = getBookingsForFacilityAndDate(facility, date);
      if (dayBookings.length === 0) return 'h-16'; // Default height for empty days
      if (dayBookings.length <= 2) return 'h-20'; // Small height for few bookings
      if (dayBookings.length <= 4) return 'h-24'; // Medium height for moderate bookings
      return 'h-32'; // Large height for many bookings
    };
    
    return (
      <div className="p-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
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
              {facilities.map((facility, facilityIndex) => (
                <div key={facility._id} className={`${facilityIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <div className="grid grid-cols-8 border-b border-gray-200">
                    <div className="p-4 font-medium text-gray-900 border-r border-gray-200 bg-gray-50">
                      <div className="text-lg font-semibold">{facility.name}</div>
                      <div className="text-sm text-gray-500 mt-1">Cap: {facility.capacity}</div>
                      <div className="text-xs text-gray-400 mt-1">{facility.size}</div>
                    </div>
                    
                    {weekDates.map((date, dateIndex) => {
                      const dayBookings = getBookingsForFacilityAndDate(facility, date);
                      const cellHeight = getCellHeight(facility, date);
                      const isToday = formatDateForComparison(date) === formatDateForComparison(new Date());
                      
                      return (
                        <div 
                          key={dateIndex} 
                          className={`border-r border-gray-200 last:border-r-0 relative ${cellHeight} ${
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
                              {dayBookings.map((booking, bookingIndex) => (
                                <div
                                  key={booking._id}
                                  className={`rounded-lg p-2 cursor-pointer hover:opacity-90 transition-all transform hover:scale-105 ${
                                    booking.status === 'confirmed' 
                                      ? 'bg-blue-500 text-white shadow-md' : 'bg-amber-500 text-white shadow-md'
                                  }`}
                                  title={`${booking.startTime}-${booking.endTime} - ${booking.userName} - ${booking.purpose}`}
                                >
                                  <div className="font-medium text-xs truncate">
                                    {booking.startTime}-{booking.endTime}
                                  </div>
                                  <div className="text-xs opacity-90 truncate">
                                    {booking.userName}
                                  </div>
                                  {booking.purpose && (
                                    <div className="text-xs opacity-75 truncate mt-1">
                                      {booking.purpose}
                                    </div>
                                  )}
                                </div>
                              ))}
                              
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
                  {facilities.filter(f => f.status === 'available').length}
                </p>
                <p className="text-xs text-gray-500">Facilities Now</p>
              </div>
              <MapPin className="w-8 h-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Peak Time</p>
                <p className="text-2xl font-bold text-gray-900">16:00</p>
                <p className="text-xs text-gray-500">Most Bookings</p>
              </div>
              <Clock className="w-8 h-8 text-amber-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Utilization</p>
                <p className="text-2xl font-bold text-gray-900">68%</p>
                <p className="text-xs text-gray-500">This Week</p>
              </div>
              <Users className="w-8 h-8 text-purple-500" />
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
        
        <form onSubmit={editingBooking ? handleUpdateBooking : handleBookingSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Facility</label>
              <select
                value={bookingForm.facility}
                onChange={(e) => setBookingForm({...bookingForm, facility: e.target.value})}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select a facility</option>
                {facilities.filter(f => f.status === 'available').map(facility => (
                  <option key={facility._id} value={facility.name}>{facility.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
              <input
                type="date"
                value={bookingForm.date}
                onChange={(e) => setBookingForm({...bookingForm, date: e.target.value})}
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
                onChange={(e) => setBookingForm({...bookingForm, startTime: e.target.value})}
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
                onChange={(e) => setBookingForm({...bookingForm, endTime: e.target.value})}
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
              type="text"
              value={bookingForm.purpose}
              onChange={(e) => setBookingForm({...bookingForm, purpose: e.target.value})}
              placeholder="e.g., Basketball Training, Team Meeting"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Recurring Booking</label>
            <select
              value={bookingForm.recurring}
              onChange={(e) => setBookingForm({...bookingForm, recurring: e.target.value})}
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
              onClick={() => setShowBookingModal(false)}
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
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Capacity</span>
                    <span className="text-sm font-medium">{selectedFacility.capacity} people</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Size</span>
                    <span className="text-sm font-medium">{selectedFacility.size}</span>
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
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-8 gap-2 text-xs">
                  <div className="font-medium text-gray-700">Time</div>
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                    <div key={day} className="font-medium text-gray-700 text-center">{day}</div>
                  ))}
                  
                  {['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'].map(time => (
                    <>
                      <div key={time} className="font-medium text-gray-600">{time}</div>
                      {[1, 2, 3, 4, 5, 6, 7].map(day => (
                        <div
                          key={`${time}-${day}`}
                          className={`h-8 rounded ${
                            Math.random() > 0.6 ? 'bg-red-200' : 'bg-green-200'
                          }`}
                        ></div>
                      ))}
                    </>
                  ))}
                </div>
              </div>
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

  // Show loading state
  if (loading) {
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
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Connection Error</h2>
          <p className="text-gray-500 mb-4">{error}</p>
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
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">User Management</h3>
              <p className="text-gray-600">Manage system users and permissions</p>
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
      </div>
      
      {showBookingModal && <BookingModal />}
      {selectedFacility && <FacilityDetailModal />}
    </div>
  );
};

export default App;