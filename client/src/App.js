/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Calendar, MapPin, Users, Clock, ChevronRight, Grid, Plus, Search, Map, User, Settings, LogOut, Home, X, Edit2, Trash2, Eye, Table2, ChevronLeft, Tag } from 'lucide-react';
import api from './services/api';
import { useAuth, AuthProvider } from './contexts/AuthContext';
import Login from './components/Login';
import Register from './components/Register';
import MapView from './components/MapView';
import ToastContainer from './components/ToastContainer';
import useToast from './hooks/useToast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { createRoot } from 'react-dom/client';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip as ChartTooltip, Legend } from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ChartTooltip, Legend);

const AppContent = () => {
  const { user, isAdmin, isCollaborator, canBook, canManageUsers, canManageFacilities, canViewReports, canEditBooking, canDeleteBooking, logout, login, register, loading: authLoading, error: authError, setError: setAuthError } = useAuth();
  const { toasts, addToast, removeToast, showSuccess, showError, showWarning, showInfo } = useToast();
  
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [reportsWeek, setReportsWeek] = useState(new Date());
  const [facilityFilter, setFacilityFilter] = useState('all');
  const [reportFacilityId, setReportFacilityId] = useState(null);
  const reportPreviewRef = useRef(null);
  const reportHiddenRef = useRef(null);
  const [utilizationChartType, setUtilizationChartType] = useState('bar'); // 'bar' | 'line'
  const [bookingForm, setBookingForm] = useState({
    facility: '',
    date: new Date().toISOString().split('T')[0], // Default to today
    startTime: '',
    endTime: '',
    purpose: '',
    recurring: 'none'
  });
  const purposeInputRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterFacilityId, setFilterFacilityId] = useState('all');
  const [filterDate, setFilterDate] = useState(''); // yyyy-mm-dd
  const [filterRecurring, setFilterRecurring] = useState('all'); // all | recurring | one-time
  const [filterDuration, setFilterDuration] = useState('all'); // all | gt4h | lte4h
  const [filterUser, setFilterUser] = useState('all'); // admin only
  const [facilities, setFacilities] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  // Users page filters
  const [userVerifiedFilter, setUserVerifiedFilter] = useState('all'); // all | verified | unverified
  const [userActiveFilter, setUserActiveFilter] = useState('all'); // all | active | blocked
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserBookings, setShowUserBookings] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState(null);
  // Facilities filters
  const [facilitySearchTerm, setFacilitySearchTerm] = useState('');
  const [facilityStatusFilter, setFacilityStatusFilter] = useState('all');
  const [equipmentSelected, setEquipmentSelected] = useState([]);
  const [showAllEquipmentFilters, setShowAllEquipmentFilters] = useState(false);
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
      const todayStr = new Date().toISOString().split('T')[0];
      if (bookingForm.date < todayStr) {
        showError('Cannot update a booking to a past date.');
        return;
      }
      // Find the facility ID from the name
      const facility = facilities.find(f => f.name === bookingForm.facility);
      if (!facility) {
        throw new Error('Facility not found');
      }
      if ((facility.status || '').toLowerCase() !== 'open') {
        showError('This facility is closed and cannot be booked.');
        return;
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
      showSuccess('Booking updated successfully!');
    } catch (error) {
      console.error('Error updating booking:', error);
      showError('Failed to update booking: ' + error.message);
    }
  };

  // Handle delete booking (will delete entire series if recurring)
  const handleDeleteBooking = async (bookingId) => {
    if (window.confirm('Are you sure you want to delete this booking?')) {
      try {
              await api.deleteBooking(bookingId);
      await refreshData();
      showSuccess('Booking deleted successfully');
      console.log('Booking deleted successfully!');
    } catch (error) {
        console.error('Error deleting booking:', error);
        showError('Failed to delete booking: ' + error.message);
      }
    }
  };

  // Handle verify booking (admin)
  const handleVerifyBooking = async (bookingId) => {
    try {
            await api.verifyBooking(bookingId);
      await refreshData();
      showSuccess('Booking verified successfully');
    } catch (error) {
        console.error('Error verifying booking:', error);
        showError('Failed to verify booking: ' + error.message);
      }
  };

  // Handle form field changes - use callback to prevent unnecessary re-renders
  const handleFormChange = (field, value) => {
    setBookingForm(prev => {
      // If changing facility, clear time selections since availability may differ
      if (field === 'facility') {
        return {...prev, [field]: value, startTime: '', endTime: ''};
      }
      return {...prev, [field]: value};
    });
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      if (bookingForm.date < todayStr) {
        showError('Cannot create a booking in the past.');
        return;
      }
      // Find the facility ID from the name
      const facility = facilities.find(f => f.name === bookingForm.facility);
      if (!facility) {
        throw new Error('Facility not found');
      }
      if ((facility.status || '').toLowerCase() !== 'open') {
        showError('This facility is closed and cannot be booked.');
        return;
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
        notes: ''
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
        startTime: '',
        endTime: '',
        purpose: '',
        recurring: 'none'
      });
      
      // Show success message with recurring info
      let successMessage = 'Booking created successfully!';
      if (bookingData.recurring && bookingData.recurring !== 'none') {
        const recurringText = {
          'weekly': 'weekly',
          'biweekly': 'bi-weekly',
          'monthly': 'monthly'
        }[bookingData.recurring];
        successMessage = `Booking created successfully! This ${recurringText} booking will repeat for the next 12 occurrences.`;
      }
      showSuccess(successMessage);
      
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
      showError(errorMessage);
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
        showSuccess('Facility updated successfully');
      } else {
        await api.createFacility(payload);
        showSuccess('Facility created successfully');
      }
      await refreshData();
      setShowFacilityModal(false);
      setEditingFacility(null);
    } catch (error) {
      console.error('Error saving facility:', error);
      showError('Failed to save facility: ' + (error.message || 'Unknown error'));
    }
  };

  const handleDeleteFacility = async (facilityId) => {
    if (!window.confirm('Are you sure you want to delete this facility?')) return;
    try {
      await api.deleteFacility(facilityId);
      await refreshData();
      showSuccess('Facility deleted successfully');
    } catch (error) {
      console.error('Error deleting facility:', error);
      showError('Failed to delete facility: ' + (error.message || 'Unknown error'));
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
      showSuccess('User unverified successfully');
    } catch (error) {
      console.error('Error unverifying user:', error);
      showError('Failed to unverify user: ' + (error.message || 'Unknown error'));
    }
  };

  const handleVerifyUser = async (userId) => {
    if (!canManageUsers()) return;
    const target = users.find(u => u._id === userId);
    if (target?.role === 'admin') return;
    try {
      await api.updateUser(userId, { verified: true });
      await refreshData();
      showSuccess('User verified successfully');
    } catch (error) {
      console.error('Error verifying user:', error);
      showError('Failed to verify user: ' + (error.message || 'Unknown error'));
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
      showSuccess('User blocked successfully');
    } catch (error) {
      console.error('Error deactivating user:', error);
      showError('Failed to block user: ' + (error.message || 'Unknown error'));
    }
  };

  const handleReactivateUser = async (userId) => {
    if (!canManageUsers()) return;
    const target = users.find(u => u._id === userId);
    if (target?.role === 'admin') return;
    try {
      await api.updateUser(userId, { isActive: true });
      await refreshData();
      showSuccess('User unblocked successfully');
    } catch (error) {
      console.error('Error reactivating user:', error);
      showError('Failed to unblock user: ' + (error.message || 'Unknown error'));
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

  // Build weekly grid text for a facility to export
  // Render a timetable-like DOM for a facility and week
  const renderTimetableDOM = (facility, weekDate, container) => {
    const weekDates = getWeekDates(weekDate);
    const dayNames = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
    const startOfDayMin = 6 * 60;
    const endOfDayMin = 22 * 60;
    const hourHeightPx = 36;
    const totalHours = (endOfDayMin - startOfDayMin) / 60;
    const hours = Array.from({ length: totalHours + 1 }, (_, i) => 6 + i);

    const node = (
      <div style={{ padding: 24, width: 1100, background: '#fff', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 8 }}>{facility.name} Timetable</div>
        <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 12 }}>{getWeekRange(weekDate)}</div>
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '90px repeat(7, 1fr)', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <div style={{ padding: 8, fontWeight: 500 }}>Time</div>
            {dayNames.map((d, i) => (
              <div key={d} style={{ padding: 8, textAlign: 'center', fontWeight: 500 }}>
                <div>{d}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>{weekDates[i].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '90px repeat(7, 1fr)' }}>
            {/* Time axis */}
            <div style={{ position: 'relative', height: totalHours * hourHeightPx, background: '#fafafa', borderRight: '1px solid #e5e7eb' }}>
              {hours.map((h, idx) => (
                <div key={h} style={{ position: 'absolute', top: idx * hourHeightPx - 6, left: 0, right: 0 }}>
                  <div style={{ textAlign: 'right', paddingRight: 8, fontSize: 10, color: '#6b7280' }}>{String(h).padStart(2, '0')}:00</div>
                  <div style={{ borderTop: '1px solid #e5e7eb', marginTop: 6 }}></div>
                </div>
              ))}
            </div>
            {/* Day columns */}
            {weekDates.map((date, i) => {
              const dayBookings = bookings
                .filter(b => b.facilityName === facility.name && new Date(b.date).toISOString().split('T')[0] === date.toISOString().split('T')[0])
                .sort((a,b) => a.startTime.localeCompare(b.startTime));
              const parse = (t) => { const [hh, mm] = (t||'00:00').split(':').map(Number); return (hh*60 + mm); };
              const blockStyle = (start, end) => {
                const s = Math.max(parse(start), startOfDayMin);
                const e = Math.min(parse(end), endOfDayMin);
                const top = ((s - startOfDayMin) / 60) * hourHeightPx;
                const height = Math.max(18, ((e - s) / 60) * hourHeightPx - 2);
                return { position: 'absolute', left: 6, right: 6, top, height, borderRadius: 6, padding: '4px 6px', color: '#fff', fontSize: 10 };
              };
              return (
                <div key={i} style={{ position: 'relative', borderRight: '1px solid #f3f4f6', height: totalHours * hourHeightPx }}>
                  {hours.map((h, idx) => (
                    <div key={h} style={{ position: 'absolute', top: idx * hourHeightPx, left: 0, right: 0, borderTop: '1px solid #f3f4f6' }}></div>
                  ))}
                  {dayBookings.map((b, idx2) => (
                    <div key={idx2} style={{ ...blockStyle(b.startTime, b.endTime), background: b.status==='confirmed' ? '#2563eb' : '#f59e0b', boxShadow: '0 1px 2px rgba(0,0,0,0.08)' }}>
                      <div style={{ opacity: 0.9 }}>{b.startTime}-{b.endTime}</div>
                      <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.purpose || b.userName}</div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );

    const root = createRoot(container);
    root.render(node);
    return root;
  };

  const exportFacilityAsPdf = async (facility) => {
    // Render hidden DOM timetable and capture
    if (!reportHiddenRef.current) return;
    const container = document.createElement('div');
    reportHiddenRef.current.innerHTML = '';
    reportHiddenRef.current.appendChild(container);
    const root = renderTimetableDOM(facility, reportsWeek, container);
    await new Promise(r => setTimeout(r, 50));
    const canvas = await html2canvas(container, { scale: 2, backgroundColor: '#ffffff' });
    root.unmount?.();
    const imgData = canvas.toDataURL('image/png');
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    // Fit image into A4 keeping aspect
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const imgWidth = pageWidth - 40;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    doc.addImage(imgData, 'PNG', 20, 20, imgWidth, Math.min(imgHeight, pageHeight - 40));
    doc.save(`${facility.name.replace(/\s+/g,'_')}_${getWeekRange(reportsWeek).replace(/\s+/g,'_')}.pdf`);
  };

  const exportAllFacilitiesAsPdf = async () => {
    if (!reportHiddenRef.current) return;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    for (let i = 0; i < facilities.length; i++) {
      const f = facilities[i];
      if (i > 0) doc.addPage();
      const container = document.createElement('div');
      reportHiddenRef.current.innerHTML = '';
      reportHiddenRef.current.appendChild(container);
      const root = renderTimetableDOM(f, reportsWeek, container);
      await new Promise(r => setTimeout(r, 50));
      const canvas = await html2canvas(container, { scale: 2, backgroundColor: '#ffffff' });
      root.unmount?.();
      const imgData = canvas.toDataURL('image/png');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 40;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      doc.addImage(imgData, 'PNG', 20, 20, imgWidth, Math.min(imgHeight, pageHeight - 40));
    }
    doc.save(`All_Facilities_${getWeekRange(reportsWeek).replace(/\s+/g,'_')}.pdf`);
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

  // Group recurring bookings to avoid showing duplicates.
  // Past occurrences are split out as individual bookings; only future ones are grouped.
  const groupRecurringBookings = (bookings) => {
    const grouped = [];
    const processed = new Set();

    bookings.forEach(booking => {
      if (processed.has(booking._id)) return;

      if (booking.recurring && booking.recurring !== 'none') {
        // Find all related recurring bookings
        const relatedBookings = bookings.filter(b => 
          b.facilityName === booking.facilityName &&
          b.startTime === booking.startTime &&
          b.endTime === booking.endTime &&
          b.userName === booking.userName &&
          b.purpose === booking.purpose &&
          b.recurring === booking.recurring &&
          b.status === booking.status
        );

        // Split past and future; only group future occurrences.
        const now = new Date();
        const past = relatedBookings.filter(b => new Date(new Date(b.date).setHours(23,59,59,999)) < now);
        const future = relatedBookings.filter(b => new Date(new Date(b.date).setHours(0,0,0,0)) >= new Date(now.toDateString()));

        // Push all past occurrences individually
        past.forEach(p => {
          grouped.push(p);
          processed.add(p._id);
        });

        // Only group if there are actually multiple future occurrences
        if (future.length > 1) {
          // Sort by date ascending and use the first future occurrence for display
          const firstFuture = [...future].sort((a, b) => new Date(a.date) - new Date(b.date))[0];
          grouped.push({
            ...firstFuture,
            isRecurring: true,
            recurrenceCount: future.length,
            recurrencePattern: booking.recurring
          });

          // Mark all future related bookings as processed
          future.forEach(b => processed.add(b._id));
        } else if (future.length === 1) {
          // Single future occurrence, treat as non-recurring
          grouped.push(future[0]);
          processed.add(future[0]._id);
        }
      } else {
        // Non-recurring booking
        grouped.push(booking);
        processed.add(booking._id);
      }
    });

    return grouped;
  };

  // Get recurrence symbol and tooltip
  const getRecurrenceInfo = (recurring, count) => {
    if (!recurring || recurring === 'none') return { symbol: '', tooltip: '' };
    
    const symbols = {
      weekly: '↻',
      biweekly: '↻×2',
      monthly: '⇄'
    };
    
    const tooltips = {
      weekly: `Weekly recurring (${count} occurrences)`,
      biweekly: `Bi-weekly recurring (${count} occurrences)`,
      monthly: `Monthly recurring (${count} occurrences)`
    };
    
    return {
      symbol: symbols[recurring],
      tooltip: tooltips[recurring]
    };
  };

  // Limit visibility by role:
  // - Admin: all bookings
  // - Collaborator: only their own bookings (past and future)
  const baseBookings = isAdmin() ? bookings : bookings.filter(b => b.user === user?._id);

  const filteredBookings = baseBookings.filter(booking => {
    const matchesSearch = booking.facilityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          booking.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          booking.purpose.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || booking.status === filterStatus;
    const matchesFacility = filterFacilityId === 'all' || booking.facility === filterFacilityId;
    const matchesDate = !filterDate || new Date(booking.date).toISOString().split('T')[0] === filterDate;
    const isRecurring = booking.recurring && booking.recurring !== 'none';
    const matchesRecurring = filterRecurring === 'all' || (filterRecurring === 'recurring' ? isRecurring : !isRecurring);
    const [sh, sm] = (booking.startTime||'00:00').split(':').map(Number);
    const [eh, em] = (booking.endTime||'00:00').split(':').map(Number);
    const durationMinutes = (eh * 60 + em) - (sh * 60 + sm);
    const matchesDuration = filterDuration === 'all' || (filterDuration === 'gt4h' ? durationMinutes > 240 : durationMinutes <= 240);
    const matchesUser = !isAdmin() || filterUser === 'all' || booking.user === filterUser;
    return matchesSearch && matchesStatus && matchesFacility && matchesDate && matchesRecurring && matchesDuration && matchesUser;
  });

  // Group recurring bookings for display
  const displayBookings = groupRecurringBookings(filteredBookings);
  // Users filtering
  const filteredUsers = useMemo(() => {
    const term = userSearchTerm.trim().toLowerCase();
    return users
      .filter((u) => userVerifiedFilter === 'all' ? true : userVerifiedFilter === 'verified' ? u.verified : !u.verified)
      .filter((u) => userActiveFilter === 'all' ? true : userActiveFilter === 'active' ? (u.isActive !== false) : (u.isActive === false))
      .filter((u) => {
        if (!term) return true;
        const name = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
        const email = (u.email || '').toLowerCase();
        return name.includes(term) || email.includes(term);
      });
  }, [users, userVerifiedFilter, userActiveFilter, userSearchTerm]);

  const activeUsersFilterCount = useMemo(() => {
    let c = 0;
    if (userVerifiedFilter !== 'all') c++;
    if (userActiveFilter !== 'all') c++;
    if (userSearchTerm.trim()) c++;
    return c;
  }, [userVerifiedFilter, userActiveFilter, userSearchTerm]);

  const clearUsersFilters = () => {
    setUserVerifiedFilter('all');
    setUserActiveFilter('all');
    setUserSearchTerm('');
  };

  // Bookings filters UI helpers
  const activeBookingsFilterCount = useMemo(() => {
    let c = 0;
    if (filterStatus !== 'all') c++;
    if (filterFacilityId !== 'all') c++;
    if (filterDate) c++;
    if (filterRecurring !== 'all') c++;
    if (filterDuration !== 'all') c++;
    if (isAdmin() && filterUser !== 'all') c++;
    return c;
  }, [filterStatus, filterFacilityId, filterDate, filterRecurring, filterDuration, filterUser]);

  const clearBookingsFilters = () => {
    setFilterStatus('all');
    setFilterFacilityId('all');
    setFilterDate('');
    setFilterRecurring('all');
    setFilterDuration('all');
    setFilterUser('all');
  };

  // Unique equipment list for filters
  const uniqueEquipment = useMemo(() => {
    const all = new Set();
    (facilities || []).forEach(f => (f.equipment || []).forEach(e => all.add(e)));
    return Array.from(all).sort((a,b) => a.localeCompare(b));
  }, [facilities]);

  // Filter facilities list
  const filteredFacilitiesList = useMemo(() => {
    const search = facilitySearchTerm.toLowerCase();
    return (facilities || []).filter(f => {
      const matchesSearch = !search || f.name.toLowerCase().includes(search);
      const matchesStatus = facilityStatusFilter === 'all' || (f.status || '').toLowerCase() === facilityStatusFilter;
      const equipment = f.equipment || [];
      const matchesEquipment = equipmentSelected.length === 0 || equipmentSelected.every(eq => equipment.includes(eq));
      return matchesSearch && matchesStatus && matchesEquipment;
    });
  }, [facilities, facilitySearchTerm, facilityStatusFilter, equipmentSelected]);

  const toggleEquipmentFilter = (eq) => {
    setEquipmentSelected(prev => prev.includes(eq) ? prev.filter(e => e !== eq) : [...prev, eq]);
  };
  const clearEquipmentFilter = () => setEquipmentSelected([]);

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

  const UtilizationChart = ({ facilities, bookings, type = 'bar' }) => {
    const labels = Array.from({ length: 17 }, (_, i) => `${String(6 + i).padStart(2, '0')}:00`); // 06..22
    const computeSeries = (fac) => labels.map((label) => {
      const hour = parseInt(label.split(':')[0], 10);
      let minutes = 0;
      getWeekDates(reportsWeek).forEach((d) => {
        const dateStr = new Date(d).toISOString().split('T')[0];
        bookings.filter(b => b.facilityName === fac.name && new Date(b.date).toISOString().split('T')[0] === dateStr)
          .forEach(b => {
            const [sh, sm] = (b.startTime||'00:00').split(':').map(Number);
            const [eh, em] = (b.endTime||'00:00').split(':').map(Number);
            const overlapStart = Math.max(sh*60 + sm, hour*60);
            const overlapEnd = Math.min(eh*60 + em, (hour+1)*60);
            minutes += Math.max(0, overlapEnd - overlapStart);
          });
      });
      return Math.round((minutes / (7 * 60)) * 100);
    });

    let data, options;
    if (type === 'bar') {
      const datasets = facilities.map((f, idx) => {
        const hue = (idx * 53) % 360;
        return {
          label: f.name,
          data: computeSeries(f),
          backgroundColor: `hsla(${hue}, 70%, 55%, 0.4)`,
          borderColor: `hsl(${hue}, 70%, 45%)`,
          borderWidth: 1,
          type: 'bar'
        };
      });
      data = { labels, datasets };
      options = { responsive: true, plugins: { legend: { position: 'bottom' }, tooltip: { mode: 'index', intersect: false } }, scales: { y: { title: { display: true, text: '% occupied' }, suggestedMin: 0, suggestedMax: 100 } } };
      return <Bar data={data} options={options} />;
    } else {
      // average line across all facilities
      const sums = labels.map(() => 0);
      facilities.forEach(f => {
        const series = computeSeries(f);
        series.forEach((v, i) => { sums[i] += v; });
      });
      const avg = sums.map(v => facilities.length ? Math.round(v / facilities.length) : 0);
      data = { labels, datasets: [{ label: 'Average Utilization', data: avg, borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.2)', tension: 0.3 }] };
      options = { responsive: true, plugins: { legend: { position: 'bottom' } }, scales: { y: { title: { display: true, text: '% occupied' }, suggestedMin: 0, suggestedMax: 100 } } };
      return <Line data={data} options={options} />;
    }
  };

  // Helper function to check if a timeslot is booked
  const isTimeslotBooked = (facility, dayKey, slotIdx) => {
    if (!facility || !bookings || bookings.length === 0) return false;
    
    // Convert slot index to time string (e.g., slotIdx 0 = "07:00", slotIdx 1 = "07:30")
    const hour = 7 + Math.floor(slotIdx / 2);
    const minute = slotIdx % 2 === 0 ? '00' : '30';
    
    // Get the day name from the dayKey
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayIndex = dayNames.indexOf(dayKey);
    
    // Get today's date and calculate the target date
    const today = new Date();
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + (dayIndex - today.getDay() + 7) % 7);
    const targetDateStr = targetDate.toISOString().split('T')[0];
    
    // Check if any booking overlaps with this timeslot
    return bookings.some(booking => {
      const bookingDate = new Date(booking.date).toISOString().split('T')[0];
      if (booking.facilityName !== facility.name || bookingDate !== targetDateStr) return false;
      
      // Check if the timeslot overlaps with the booking
      const [startHour, startMin] = booking.startTime.split(':').map(Number);
      const [endHour, endMin] = booking.endTime.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      const slotStartMinutes = hour * 60 + minute;
      const slotEndMinutes = slotStartMinutes + 30; // Each slot is 30 minutes
      
      // Check for overlap
      return slotStartMinutes < endMinutes && slotEndMinutes > startMinutes;
    });
  };

  // Reusable component to render half-hour opening grid
  const OpeningHoursGrid = ({ grid, onToggle, readOnly = false, facility = null }) => {
    const scrollRef = useRef(null);
    const containerRef = useRef(null);
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
      <div ref={containerRef} className="overflow-x-hidden">
        <div ref={scrollRef}>
          <div>
            <div className="grid grid-cols-8 gap-1 text-xs mb-2">
              <div className="font-medium text-gray-700">Time</div>
              {days.map(d => (
                <div key={d.key} className="font-medium text-gray-700 text-center">{d.label}</div>
              ))}
            </div>
            {slots.map((label, slotIdx) => (
              <div key={label} className="grid grid-cols-8 gap-1 items-center mb-1">
                <div className="text-gray-600 w-14 text-xs">{label}</div>
                {days.map(d => {
                  const isOpen = grid?.[d.key]?.[slotIdx] !== false;
                  const isBooked = facility && isTimeslotBooked(facility, d.key, slotIdx);
                  
                  let bgColor = 'bg-red-200'; // Default: closed
                  if (isBooked) {
                    bgColor = 'bg-orange-400'; // Booked
                  } else if (isOpen) {
                    bgColor = 'bg-green-200'; // Open
                  }
                  
                  const common = `h-6 rounded transition-colors ${bgColor}`;
                  
                  if (readOnly) {
                    return <div key={`${d.key}-${slotIdx}`} className={common}></div>;
                  }
                  return (
                    <button
                      key={`${d.key}-${slotIdx}`}
                      type="button"
                      className={common}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const currentScroll = containerRef.current ? containerRef.current.scrollTop : 0;
                        onToggle && onToggle(d.key, slotIdx);
                        // Use setTimeout instead of requestAnimationFrame
                        setTimeout(() => {
                          if (containerRef.current) {
                            containerRef.current.scrollTop = currentScroll;
                          }
                        }, 0);
                      }}
                      title={`${d.label} ${label} ${isBooked ? 'Booked' : isOpen ? 'Open' : 'Closed'}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Format opening times per day from openingHoursGrid
  const getOpeningTimeRangesForDay = (grid, dayKey) => {
    const slots = Array.from({ length: 30 }, (_, i) => i); // 0..29 (07:00 .. 21:30)
    const isOpenAt = (idx) => grid?.[dayKey]?.[idx] !== false;

    const toTimeString = (idx) => {
      // idx is a half-hour index from 0 at 07:00
      const baseMinutes = 7 * 60; // 07:00
      const minutes = baseMinutes + idx * 30;
      const hh = Math.floor(minutes / 60);
      const mm = minutes % 60;
      return `${String(hh).padStart(2, '0')}:${mm === 0 ? '00' : '30'}`;
    };

    const ranges = [];
    let currentStart = null;
    slots.forEach((idx) => {
      if (isOpenAt(idx)) {
        if (currentStart === null) currentStart = idx;
      } else if (currentStart !== null) {
        // range ends at idx
        ranges.push({ start: currentStart, end: idx });
        currentStart = null;
      }
    });
    if (currentStart !== null) {
      // open until the end (22:00 -> idx 30)
      ranges.push({ start: currentStart, end: 30 });
    }

    if (ranges.length === 0) return 'Closed';

    return ranges
      .map(({ start, end }) => `${toTimeString(start)}-${toTimeString(end)}`)
      .join(', ');
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
        
        {/* Removed list/grid toggle */}
        
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
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-50/80 to-transparent" />
          <div className="relative p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <MapPin className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-xs font-medium text-gray-500">Total</span>
            </div>
            <div className="flex items-baseline space-x-2">
              <h3 className="text-3xl font-bold tracking-tight text-gray-900">{facilities.length}</h3>
              <span className="text-sm text-gray-500">Facilities</span>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-tr from-green-50/80 to-transparent" />
          <div className="relative p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-xs font-medium text-gray-500">Today</span>
            </div>
            <div className="flex items-baseline space-x-2">
              <h3 className="text-3xl font-bold tracking-tight text-gray-900">{bookings.filter(b => {
                const today = new Date().toISOString().split('T')[0];
                const bookingDate = new Date(b.date).toISOString().split('T')[0];
                return bookingDate === today;
              }).length}</h3>
              <span className="text-sm text-gray-500">Bookings</span>
            </div>
          </div>
        </div>

        {/* Open Facilities */}
        <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-tr from-emerald-50/80 to-transparent" />
          <div className="relative p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Home className="w-6 h-6 text-emerald-600" />
              </div>
              <span className="text-xs font-medium text-gray-500">Open</span>
            </div>
            <div className="flex items-baseline space-x-2">
              <h3 className="text-3xl font-bold tracking-tight text-gray-900">{facilities.filter(f => f.status === 'open').length}</h3>
              <span className="text-sm text-gray-500">Facilities</span>
            </div>
          </div>
        </div>

        {/* Bookings next 7 days */}
        <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-tr from-purple-50/80 to-transparent" />
          <div className="relative p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
              <span className="text-xs font-medium text-gray-500">Next 7 days</span>
            </div>
            <div className="flex items-baseline space-x-2">
              <h3 className="text-3xl font-bold tracking-tight text-gray-900">{bookings.filter(b => {
                const now = new Date();
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const d = new Date(b.date);
                const dayOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                const diffDays = (dayOnly - today) / (1000 * 60 * 60 * 24);
                return diffDays >= 0 && diffDays < 7;
              }).length}</h3>
              <span className="text-sm text-gray-500">Bookings</span>
            </div>
          </div>
        </div>
      </div>

      {/* Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h3 className="text-base font-semibold text-gray-900">Today's Schedule</h3>
            <button
              onClick={refreshData}
              className="inline-flex items-center rounded-lg px-2 py-1 text-sm text-gray-600 hover:bg-gray-100"
              title="Refresh data"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <div key={booking._id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="flex items-center space-x-4">
                  <div className="w-1.5 h-10 rounded-full bg-blue-600" />
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
              <div className="text-center py-10 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No bookings scheduled for today</p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-base font-semibold text-gray-900">Facility Status</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {facilities.slice(0, 6).map(facility => (
                <div key={facility._id} className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
                  <div>
                    <h4 className="font-medium text-gray-900 text-sm">{facility.name}</h4>
                    <p className="text-xs text-gray-500">Status</p>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${facility.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {facility.status}
                  </span>
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
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search bookings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5">
                <span className="text-xs text-gray-500">Status</span>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-transparent text-sm focus:outline-none focus:ring-0">
                  <option value="all">All</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="pending">Pending</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div className="inline-flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5">
                <span className="text-xs text-gray-500">Facility</span>
                <select value={filterFacilityId} onChange={(e) => setFilterFacilityId(e.target.value)} className="bg-transparent text-sm focus:outline-none focus:ring-0">
                  <option value="all">All</option>
                  {facilities.map(f => (<option key={f._id} value={f._id}>{f.name}</option>))}
                </select>
              </div>
              <div className="inline-flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5">
                <span className="text-xs text-gray-500">Date</span>
                <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="bg-transparent text-sm focus:outline-none focus:ring-0" />
              </div>
              <div className="inline-flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5">
                <span className="text-xs text-gray-500">Type</span>
                <select value={filterRecurring} onChange={(e) => setFilterRecurring(e.target.value)} className="bg-transparent text-sm focus:outline-none focus:ring-0">
                  <option value="all">All</option>
                  <option value="recurring">Recurring</option>
                  <option value="one-time">One-time</option>
                </select>
              </div>
              <div className="inline-flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5">
                <span className="text-xs text-gray-500">Duration</span>
                <select value={filterDuration} onChange={(e) => setFilterDuration(e.target.value)} className="bg-transparent text-sm focus:outline-none focus:ring-0">
                  <option value="all">All</option>
                  <option value="gt4h">&gt; 4h</option>
                  <option value="lte4h">≤ 4h</option>
                </select>
              </div>
              {isAdmin() && (
                <div className="inline-flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5">
                  <span className="text-xs text-gray-500">User</span>
                  <select value={filterUser} onChange={(e) => setFilterUser(e.target.value)} className="bg-transparent text-sm focus:outline-none focus:ring-0">
                    <option value="all">All</option>
                    {users.map(u => (<option key={u._id} value={u._id}>{u.firstName} {u.lastName}</option>))}
                  </select>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">{displayBookings.length} bookings</span>
              {activeBookingsFilterCount > 0 && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">{activeBookingsFilterCount} active</span>
              )}
              <button onClick={clearBookingsFilters} className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50" title="Clear filters">Clear</button>
            </div>
          </div>
        </div>
        
        {
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left p-4 font-medium text-gray-700">Facility</th>
                  <th className="text-left p-4 font-medium text-gray-700">Date</th>
                  <th className="text-left p-4 font-medium text-gray-700">Time</th>
                  <th className="text-left p-4 font-medium text-gray-700">User</th>
                  <th className="text-left p-4 font-medium text-gray-700">Purpose</th>
                  <th className="text-left p-4 font-medium text-gray-700">Recurring</th>
                  <th className="text-left p-4 font-medium text-gray-700">Status</th>
                  <th className="text-left p-4 font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayBookings.map(booking => (
                  <tr key={booking._id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-4 font-medium">{booking.facilityName}</td>
                    <td className="p-4">
                      {new Date(booking.date).toLocaleDateString()}
                      {booking.isRecurring && (
                        <span className="ml-2 text-xs text-gray-500">
                          (+{booking.recurrenceCount - 1} more)
                        </span>
                      )}
                    </td>
                    <td className="p-4">{booking.startTime}-{booking.endTime}</td>
                    <td className="p-4">{booking.userName}</td>
                    <td className="p-4">{booking.purpose}</td>
                    <td className="p-4">
                      {booking.isRecurring && (
                        <div className="flex items-center space-x-1">
                          <span 
                            className="text-lg font-bold text-blue-600"
                            title={getRecurrenceInfo(booking.recurrencePattern, booking.recurrenceCount).tooltip}
                          >
                            {getRecurrenceInfo(booking.recurrencePattern, booking.recurrenceCount).symbol}
                          </span>
                          <span className="text-xs text-gray-500">
                            {booking.recurrenceCount}x
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                        {booking.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        <button className="p-1 hover:bg-gray-100 rounded" onClick={() => setSelectedBooking(booking)} title="View details">
                          <Eye className="w-4 h-4 text-gray-600" />
                        </button>
                        {(isAdmin() || canEditBooking(booking)) && !isBookingPast(booking) && (
                          <>
                            <button 
                              onClick={() => handleEditBooking(booking)}
                              className="p-1 hover:bg-gray-100 rounded"
                            >
                              <Edit2 className="w-4 h-4 text-gray-600" />
                            </button>
                            {isAdmin() && booking.status === 'pending' && (
                              <button 
                                onClick={() => handleVerifyBooking(booking._id)}
                                className="px-2 py-1 text-xs border border-green-300 text-green-700 rounded hover:bg-green-50"
                                title="Verify pending booking"
                              >
                                Verify
                              </button>
                            )}
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
        }
      </div>
    </div>
  );

  const FacilitiesView = () => (
    <div className="p-8">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[240px] max-w-lg">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search facilities..."
                value={facilitySearchTerm}
                onChange={(e) => setFacilitySearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full pl-3 pr-2 py-1.5">
                <span className="text-xs text-gray-500">Status</span>
                <select
                  value={facilityStatusFilter}
                  onChange={(e) => setFacilityStatusFilter(e.target.value)}
                  className="bg-transparent text-sm focus:outline-none focus:ring-0"
                >
                  <option value="all">All</option>
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <span className="text-sm text-gray-500">{filteredFacilitiesList.length} facilities</span>
              {equipmentSelected.length > 0 && (
                <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">{equipmentSelected.length} selected</span>
              )}
              {equipmentSelected.length > 0 && (
                <button onClick={clearEquipmentFilter} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Clear</button>
              )}
            </div>
          </div>
        </div>
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-gray-700">Equipment</h4>
            {uniqueEquipment.length > 12 && (
              <button onClick={() => setShowAllEquipmentFilters(v => !v)} className="text-xs text-blue-600 hover:text-blue-700">
                {showAllEquipmentFilters ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
          <div className="flex flex-row flex-wrap gap-2 overflow-x-auto sm:overflow-visible pr-1">
            {uniqueEquipment.length === 0 ? (
              <span className="text-xs text-gray-500">No equipment found</span>
            ) : (
              (showAllEquipmentFilters ? uniqueEquipment : uniqueEquipment.slice(0, 12)).map(eq => {
                const selected = equipmentSelected.includes(eq);
                return (
                  <button
                    key={eq}
                    type="button"
                    onClick={() => toggleEquipmentFilter(eq)}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs border transition-colors ${selected ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                    title={eq}
                  >
                    {selected && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
                    {eq}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
      {
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
                {filteredFacilitiesList.map(facility => (
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
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          title="View details"
                        >
                          <Eye className="w-4 h-4 text-blue-600" />
                        </button>
                        {canManageFacilities() && (
                          <>
                            <button
                              onClick={() => openEditFacility(facility)}
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Edit facility"
                            >
                              <Edit2 className="w-4 h-4 text-gray-600" />
                            </button>
                            <button
                              onClick={() => handleDeleteFacility(facility._id)}
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Delete facility"
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
        </div>
      }
    </div>
  );

  const TimetableView = () => {
    const weekDates = getWeekDates(selectedWeek);
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
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
          <h3 className="text-lg font-semibold text-gray-900">
            {facilityFilter === 'all' ? 'Weekly Timetable' : `${facilities.find(f => f._id === facilityFilter)?.name} Timetable`}
          </h3>
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
                              style={{ ...style, cursor: (isAdmin() || b.user === user?._id) ? 'pointer' : 'default' }}
                              title={getMaskedTitle(b)}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (isAdmin() || b.user === user?._id) {
                                  setSelectedBooking(b);
                                }
                              }}
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
                                  {facility.status === 'open' && (
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setBookingForm({
                                          ...bookingForm,
                                          facility: facility.name,
                                          date: formatDateForComparison(date),
                                          startTime: '',
                                          endTime: ''
                                        });
                                        setShowBookingModal(true);
                                      }}
                                      className="w-8 h-8 bg-green-100 hover:bg-green-200 rounded-full transition-colors flex items-center justify-center text-green-600 hover:text-green-700"
                                      title="Add booking"
                                    >
                                      <Plus className="w-4 h-4" />
                                    </button>
                                  )}
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
                                      className={`rounded-lg p-2 ${ (isAdmin() || booking.user === user?._id) ? 'cursor-pointer hover:opacity-90 transform hover:scale-105' : 'cursor-default' } transition-all ${
                                        booking.status === 'confirmed' 
                                          ? 'bg-blue-500 text-white shadow-md' : 'bg-amber-500 text-white shadow-md'
                                      }`}
                                      title={getMaskedTitle(booking)}
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (isAdmin() || booking.user === user?._id) {
                                          setSelectedBooking(booking);
                                        }
                                      }}
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
                                {facility.status === 'open' && (
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setBookingForm({
                                        ...bookingForm,
                                        facility: facility.name,
                                        date: formatDateForComparison(date),
                                        startTime: '',
                                        endTime: ''
                                      });
                                      setShowBookingModal(true);
                                    }}
                                    className="w-6 h-6 bg-green-100 hover:bg-green-200 rounded-full transition-colors flex items-center justify-center text-green-600 hover:text-green-700 mt-1"
                                    title="Add another booking"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                )}
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-hidden">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-7xl mx-4 max-h-[95vh] overflow-hidden">
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
                  startTime: '',
                  endTime: '',
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
          className="p-6 flex gap-6"
        >
          {/* Left Column - Form Fields */}
          <div className="w-80 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Facility</label>
              <select
                value={bookingForm.facility}
                onChange={(e) => handleFormChange('facility', e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select a facility ({facilities.filter(f => (f.status || '').toLowerCase() === 'open').length} open)</option>
                {facilities
                  .filter(f => (f.status || '').toLowerCase() === 'open')
                  .map(facility => (
                    <option key={facility._id} value={facility.name}>
                      {facility.name}
                    </option>
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
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
              <div className="text-sm text-gray-600 mb-2">Click on available time slots below</div>
              <input
                type="text"
                value={bookingForm.startTime}
                readOnly
                className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700"
                placeholder="Select start time from grid"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
              <div className="text-sm text-gray-600 mb-2">Click on available time slots below</div>
              <input
                type="text"
                value={bookingForm.endTime}
                readOnly
                className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700"
                placeholder="Select end time from grid"
              />
            </div>
            
            <div>
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
            
            <div>
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
            
            <div className="pt-4">
              <div className="text-xs text-gray-600 mb-2">
                Click on available (green) slots to set start time, then click another slot to set end time.
              </div>
            </div>
            
            {/* Form Buttons */}
            <div className="pt-6 border-t border-gray-200">
              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowBookingModal(false);
                    setEditingBooking(null);
                    setBookingForm({
                      facility: '',
                      date: new Date().toISOString().split('T')[0], // Default to today
                      startTime: '',
                      endTime: '',
                      purpose: '',
                      recurring: 'none'
                    });
                  }}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  {editingBooking ? 'Update Booking' : 'Create Booking'}
                </button>
              </div>
            </div>
          </div>
          
          {/* Right Column - Full Timetable */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-3">Available Time Slots</label>
            <div className="bg-gray-50 rounded-lg p-4">
              {(() => {
                const selectedFacility = facilities.find(f => f.name === bookingForm.facility);
                if (!selectedFacility) return <div className="text-gray-500 text-center py-4">Select a facility first</div>;
                
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
                
                const getDayFromDate = (dateStr) => {
                  const date = new Date(dateStr);
                  const dayIndex = (date.getDay() + 6) % 7; // Convert to Monday=0 format
                  return days[dayIndex].key;
                };
                
                const selectedDay = getDayFromDate(bookingForm.date);
                
                const isSlotAvailable = (day, slotIdx) => {
                  return selectedFacility.openingHoursGrid?.[day]?.[slotIdx] !== false;
                };
                
                const handleSlotClick = (day, slotIdx, time, event) => {
                  if (!isSlotAvailable(day, slotIdx)) return;
                  
                  // Prevent default behavior and stop propagation
                  event.preventDefault();
                  event.stopPropagation();
                  
                  if (!bookingForm.startTime) {
                    // Set start time
                    setBookingForm(prev => ({ ...prev, startTime: time }));
                  } else if (!bookingForm.endTime) {
                    // Set end time - must be after start time
                    const startIdx = slots.indexOf(bookingForm.startTime);
                    if (slotIdx > startIdx) {
                      setBookingForm(prev => ({ ...prev, endTime: time }));
                    }
                  } else {
                    // Reset and set new start time
                    setBookingForm(prev => ({ ...prev, startTime: time, endTime: '' }));
                  }
                };
                
                const isSlotSelected = (time) => {
                  return time === bookingForm.startTime || time === bookingForm.endTime;
                };
                
                const isSlotInRange = (time) => {
                  if (!bookingForm.startTime || !bookingForm.endTime) return false;
                  const startIdx = slots.indexOf(bookingForm.startTime);
                  const endIdx = slots.indexOf(bookingForm.endTime);
                  const currentIdx = slots.indexOf(time);
                  return currentIdx >= startIdx && currentIdx <= endIdx;
                };
                
                return (
                  <div>
                    <div className="grid grid-cols-8 gap-1 text-xs mb-2">
                      <div className="font-medium text-gray-700">Time</div>
                      {days.map(d => (
                        <div key={d.key} className="font-medium text-gray-700 text-center">{d.label}</div>
                      ))}
                    </div>
                    {slots.map((time, slotIdx) => (
                      <div key={time} className="grid grid-cols-8 gap-1 items-center mb-1">
                        <div className="text-gray-600 w-16 text-xs">{time}</div>
                        {days.map(d => {
                          const dayKey = d.key;
                          const isAvailable = isSlotAvailable(dayKey, slotIdx);
                          const isSelected = isSlotSelected(time) && dayKey === selectedDay;
                          const isInRange = isSlotInRange(time) && dayKey === selectedDay;
                          const isSelectedDay = dayKey === selectedDay;
                          
                          let bgColor = 'bg-gray-200';
                          if (isSelected) bgColor = 'bg-blue-500';
                          else if (isInRange) bgColor = 'bg-blue-200';
                          else if (isAvailable) bgColor = 'bg-green-200';
                          else bgColor = 'bg-red-200';
                          
                          return (
                            <button
                              key={`${dayKey}-${slotIdx}`}
                              type="button"
                              disabled={!isAvailable || !isSelectedDay}
                              className={`h-6 rounded transition-colors text-xs ${bgColor} ${
                                isAvailable && isSelectedDay ? 'hover:opacity-80 cursor-pointer' : 'cursor-not-allowed'
                              } ${!isSelectedDay ? 'blur-[0.5px] opacity-30' : ''}`}
                              onClick={(e) => isSelectedDay && handleSlotClick(dayKey, slotIdx, time, e)}
                              title={`${d.label} ${time} ${isAvailable ? 'Available' : 'Closed'}${!isSelectedDay ? ' (not selected day)' : ''}`}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </form>
      </div>
    </div>
  );

  const FacilityDetailModal = () => (
    selectedFacility && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-hidden">
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
                  <div className="pt-2">
                    <h5 className="text-xs font-semibold text-gray-600 mb-2">Opening times</h5>
                    <div className="grid grid-cols-2 gap-y-1 text-sm">
                      <span className="text-gray-500">Mon</span>
                      <span className="text-gray-900">{getOpeningTimeRangesForDay(selectedFacility.openingHoursGrid, 'monday')}</span>
                      <span className="text-gray-500">Tue</span>
                      <span className="text-gray-900">{getOpeningTimeRangesForDay(selectedFacility.openingHoursGrid, 'tuesday')}</span>
                      <span className="text-gray-500">Wed</span>
                      <span className="text-gray-900">{getOpeningTimeRangesForDay(selectedFacility.openingHoursGrid, 'wednesday')}</span>
                      <span className="text-gray-500">Thu</span>
                      <span className="text-gray-900">{getOpeningTimeRangesForDay(selectedFacility.openingHoursGrid, 'thursday')}</span>
                      <span className="text-gray-500">Fri</span>
                      <span className="text-gray-900">{getOpeningTimeRangesForDay(selectedFacility.openingHoursGrid, 'friday')}</span>
                      <span className="text-gray-500">Sat</span>
                      <span className="text-gray-900">{getOpeningTimeRangesForDay(selectedFacility.openingHoursGrid, 'saturday')}</span>
                      <span className="text-gray-500">Sun</span>
                      <span className="text-gray-900">{getOpeningTimeRangesForDay(selectedFacility.openingHoursGrid, 'sunday')}</span>
                    </div>
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
                facility={selectedFacility}
              />
              
              {/* Color Legend */}
              <div className="mt-4 flex items-center space-x-6 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-green-200 rounded"></div>
                  <span className="text-gray-600">Available</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-orange-400 rounded"></div>
                  <span className="text-gray-600">Booked</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-red-200 rounded"></div>
                  <span className="text-gray-600">Closed</span>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex items-center justify-end space-x-3">
              {selectedFacility.status === 'open' ? (
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
              ) : (
                <div className="text-sm text-red-600 font-medium">Facility is closed</div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  );

  const BookingDetailModal = () => (
    selectedBooking && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-hidden">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">Booking Details</h3>
              <button
                onClick={() => setSelectedBooking(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Facility</p>
                <p className="text-sm font-medium text-gray-900">{selectedBooking.facilityName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Date</p>
                <p className="text-sm font-medium text-gray-900">{new Date(selectedBooking.date).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Time</p>
                <p className="text-sm font-medium text-gray-900">{selectedBooking.startTime}-{selectedBooking.endTime}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Booked By</p>
                <p className="text-sm font-medium text-gray-900">{selectedBooking.userName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedBooking.status)}`}>
                  {selectedBooking.status}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500">Recurring</p>
                <p className="text-sm font-medium text-gray-900 capitalize">{selectedBooking.recurring && selectedBooking.recurring !== 'none' ? selectedBooking.recurring : 'none'}</p>
              </div>
            </div>
            {selectedBooking.purpose && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Purpose</p>
                <p className="text-sm text-gray-900">{selectedBooking.purpose}</p>
              </div>
            )}
            {selectedBooking.notes && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Notes</p>
                <p className="text-sm text-gray-900">{selectedBooking.notes}</p>
              </div>
            )}
            
            <div className="flex items-center justify-end gap-2 pt-2">
              {(isAdmin() || canEditBooking(selectedBooking)) && !isBookingPast(selectedBooking) && (
                <>
                  <button
                    onClick={() => { handleEditBooking(selectedBooking); setSelectedBooking(null); }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                    title="Edit booking"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => { handleDeleteBooking(selectedBooking._id); setSelectedBooking(null); }}
                    className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-50"
                    title="Delete booking"
                  >
                    Delete
                  </button>
                </>
              )}
              <button
                onClick={() => setSelectedBooking(null)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
              >
                Close
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-hidden">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-7xl mx-4 max-h-[95vh] overflow-hidden">
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
        <form onSubmit={handleSaveFacility} className="p-6 flex gap-6">
          {/* Left Column - Form Fields */}
          <div className="w-80 space-y-6">
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
                      onClick={(e) => {
                        e.stopPropagation();
                        setFacilityForm(prev => ({
                          ...prev,
                          equipmentList: prev.equipmentList.filter((_, i) => i !== idx)
                        }));
                      }}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                      aria-label="Remove equipment"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFacilityForm(prev => ({ ...prev, equipmentList: [...prev.equipmentList, ''] }));
                  }}
                  className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm"
                >
                  + Add Equipment
                </button>
              </div>
            </div>
            
            {/* Form Buttons */}
            <div className="pt-6 border-t border-gray-200">
              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowFacilityModal(false); setEditingFacility(null); }}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
          
          {/* Right Column - Full Timetable */}
          <div className="flex-1">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Weekly Schedule</h4>
            <div className="bg-gray-50 rounded-lg p-3">
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
                facility={editingFacility}
              />
            </div>
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
              showSuccess('Welcome back!');
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
              showSuccess('Registration successful! Please log in.');
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
              <div className="p-6 border-b border-gray-200 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-gray-900">All Users</h3>
                  <div className="text-sm text-gray-500">{filteredUsers.length} shown</div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative min-w-[220px]">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search name or email..."
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="inline-flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full pl-3 pr-2 py-1.5">
                    <span className="text-xs text-gray-500">Verified</span>
                    <select
                      value={userVerifiedFilter}
                      onChange={(e) => setUserVerifiedFilter(e.target.value)}
                      className="bg-transparent text-sm focus:outline-none focus:ring-0"
                      title="Filter by verification"
                    >
                      <option value="all">All</option>
                      <option value="verified">Yes</option>
                      <option value="unverified">No</option>
                    </select>
                  </div>
                  <div className="inline-flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full pl-3 pr-2 py-1.5">
                    <span className="text-xs text-gray-500">Status</span>
                    <select
                      value={userActiveFilter}
                      onChange={(e) => setUserActiveFilter(e.target.value)}
                      className="bg-transparent text-sm focus:outline-none focus:ring-0"
                      title="Filter by status"
                    >
                      <option value="all">All</option>
                      <option value="active">Active</option>
                      <option value="blocked">Blocked</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {activeUsersFilterCount > 0 && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">{activeUsersFilterCount} active</span>
                  )}
                  <button onClick={clearUsersFilters} className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Clear</button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left p-4 font-medium text-gray-700">Name</th>
                      <th className="text-left p-4 font-medium text-gray-700">Email</th>
                      <th className="text-left p-4 font-medium text-gray-700">Role</th>
                      <th className="text-left p-4 font-medium text-gray-700">Verified</th>
                      <th className="text-left p-4 font-medium text-gray-700">Active</th>
                      <th className="text-left p-4 font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
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
          <div className="p-8 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Export Weekly Timetable (PDF)</h3>
                <div className="flex items-center gap-3">
                  <label className="text-sm text-gray-600">Week starting:</label>
                  <input
                    type="date"
                    value={new Date(reportsWeek.getTime() - (reportsWeek.getDay()===0?6:reportsWeek.getDay()-1)*24*60*60*1000).toISOString().split('T')[0]}
                    onChange={(e)=>setReportsWeek(new Date(e.target.value))}
                    className="px-3 py-2 border rounded text-sm"
                  />
                  <div className="text-sm text-gray-500">{getWeekRange(reportsWeek)}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <button onClick={async () => await exportAllFacilitiesAsPdf()} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Export Combined PDF</button>
                <select value={reportFacilityId||''} onChange={(e)=>setReportFacilityId(e.target.value)} className="px-3 py-2 border rounded text-sm">
                  <option value="">Select facility...</option>
                  {facilities.map(f=> (
                    <option key={f._id} value={f._id}>{f.name}</option>
                  ))}
                </select>
                <button disabled={!reportFacilityId} onClick={async ()=>{ const f= facilities.find(x=>x._id===reportFacilityId); if(f) await exportFacilityAsPdf(f); }} className={`px-3 py-2 border rounded text-sm ${reportFacilityId? 'hover:bg-gray-50' : 'opacity-50 cursor-not-allowed'}`}>Export Selected Facility</button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Facility Utilization by Time of Day</h3>
                <div className="flex items-center gap-3">
                  <label className="text-sm text-gray-600">Chart:</label>
                  <select value={utilizationChartType} onChange={(e)=>setUtilizationChartType(e.target.value)} className="px-2 py-1 border rounded text-sm">
                    <option value="bar">Stacked Bars</option>
                    <option value="line">Average Line</option>
                  </select>
                </div>
              </div>
              <div className="overflow-x-auto">
                <div className="min-w-[800px]">
                  <UtilizationChart facilities={facilities} bookings={bookings} type={utilizationChartType} />
                </div>
              </div>
            </div>

            {/* Hidden print area for PDF render */}
            <div className="absolute left-[-9999px] top-[-9999px]" ref={reportHiddenRef} />
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
      {selectedBooking && <BookingDetailModal />}
      {showFacilityModal && canManageFacilities() && <FacilityModal />}
      {showUserBookings && <UserBookingsModal />}
      
      {/* Toast Container */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
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