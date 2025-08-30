/* eslint-disable no-unused-vars */
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Navigation, Users, Clock, Info, Calendar, Plus, MapPin } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Custom CSS to remove map text and ensure full height
const mapStyles = `
  .leaflet-container {
    height: 100vh !important;
    width: 100% !important;
  }
  .leaflet-control-attribution {
    display: none !important;
  }
  .leaflet-control-zoom {
    border: none !important;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important;
  }
  .leaflet-control-zoom a {
    background: white !important;
    color: #374151 !important;
    border: 1px solid #e5e7eb !important;
  }
  .leaflet-control-zoom a:hover {
    background: #f9fafb !important;
  }
`;

// Fix for default markers in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Component to handle map movement when facility is selected
const MapController = ({ selectedFacilityId, facilities }) => {
  const map = useMap();
  
  useEffect(() => {
    if (selectedFacilityId && selectedFacilityId !== 'all') {
      const facility = facilities.find(f => f._id === selectedFacilityId);
      if (facility && facility.location && facility.location.coordinates) {
        const [lng, lat] = facility.location.coordinates;
        map.setView([lat, lng], 18, { animate: true, duration: 1 });
      }
    }
  }, [selectedFacilityId, facilities, map]);
  
  return null;
};

const MapView = ({ facilities = [], bookings = [], onFacilityClick }) => {
  const [selectedBuilding, setSelectedBuilding] = useState('all');
  const mapRef = useRef(null);
  
  // Default center (will be adjusted based on actual facility locations)
  const defaultCenter = [49.1427, 9.2109]; // TSG Heilbronn coordinates
  
  // Create custom icons for facility status (open/closed only)
  const createCustomIcon = (status) => {
    const colors = {
      open: '#10b981',
      closed: '#ef4444'
    };
    
    const svgIcon = L.divIcon({
      html: `
        <div style="background-color: ${colors[status]}; width: 30px; height:30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2">
            <path d="M3 21h18L12 3z"/>
          </svg>
        </div>
      `,
      className: 'custom-div-icon',
      iconSize: [30, 30],
      iconAnchor: [15, 30],
      popupAnchor: [0, -30],
    });
    
    return svgIcon;
  };

  // Filter facilities with valid geographic coordinates and compute map center
  const { validFacilities, mapCenter } = useMemo(() => {
    // Filter facilities that have valid location coordinates
    const validFacilities = (facilities || []).filter(facility => 
      facility.location && 
      facility.location.coordinates && 
      Array.isArray(facility.location.coordinates) &&
      facility.location.coordinates.length === 2 &&
      typeof facility.location.coordinates[0] === 'number' &&
      typeof facility.location.coordinates[1] === 'number' &&
      !isNaN(facility.location.coordinates[0]) &&
      !isNaN(facility.location.coordinates[1]) &&
      facility.location.coordinates[0] >= -180 && facility.location.coordinates[0] <= 180 &&
      facility.location.coordinates[1] >= -90 && facility.location.coordinates[1] <= 90
    );

    // Calculate map center based on valid facilities
    let center = defaultCenter;
    if (validFacilities.length > 0) {
      const lats = validFacilities.map(f => f.location.coordinates[1]);
      const lngs = validFacilities.map(f => f.location.coordinates[0]);
      const avgLat = lats.reduce((sum, lat) => sum + lat, 0) / lats.length;
      const avgLng = lngs.reduce((sum, lng) => sum + lng, 0) / lngs.length;
      center = [avgLat, avgLng];
    }

    return { validFacilities, mapCenter: center };
  }, [facilities]);

  // Check if a facility is currently booked
  const isFacilityCurrentlyBooked = (facilityId) => {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes(); // Convert to minutes since midnight
    
    return bookings.some(booking => {
      if (booking.facility !== facilityId) return false;
      
      const bookingDate = new Date(booking.date);
      const isToday = bookingDate.toDateString() === now.toDateString();
      
      if (!isToday) return false;
      
      const startMinutes = parseInt(booking.startTime.split(':')[0]) * 60 + parseInt(booking.startTime.split(':')[1]);
      const endMinutes = parseInt(booking.endTime.split(':')[0]) * 60 + parseInt(booking.endTime.split(':')[1]);
      
      return currentTime >= startMinutes && currentTime < endMinutes;
    });
  };

  // Handle facility selection
  const handleFacilitySelect = (facilityId) => {
    setSelectedBuilding(facilityId);
  };

  return (
    <>
      <style>{mapStyles}</style>
      <div className="h-full w-full bg-white overflow-hidden relative">
        {/* Title and Facility Selector */}
        <div className="absolute top-4 left-4 z-[1000] bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-sm">
          <div className="flex items-center space-x-2 mb-3">
            <MapPin className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Facility Map</h2>
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Select Facility</label>
            <select
              value={selectedBuilding}
              onChange={(e) => handleFacilitySelect(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Facilities</option>
              {validFacilities.map(facility => (
                <option key={facility._id} value={facility._id}>
                  {facility.name} ({facility.status})
                </option>
              ))}
            </select>
            
            <div className="text-xs text-gray-500">
              {validFacilities.length} facilit{validFacilities.length !== 1 ? 'ies' : 'y'} found
            </div>
          </div>
        </div>

        {/* Floating Legend */}
        <div className="absolute top-4 right-4 z-[1000] bg-white rounded-lg shadow-lg border border-gray-200 p-3">
          <div className="text-sm font-medium text-gray-700 mb-2">Facility Status</div>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-xs text-gray-600">Open</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-xs text-gray-600">Closed</span>
            </div>
          </div>
          {validFacilities.length === 0 && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <div className="text-xs text-gray-500">
                No facilities with location data found
              </div>
            </div>
          )}
        </div>
        
        {/* Map Container - Full Screen */}
        <div className="h-full w-full">
          <MapContainer
            center={mapCenter}
            zoom={validFacilities.length > 0 ? 16 : 13}
            style={{ height: '100%', width: '100%' }}
            className="z-0"
            zoomControl={true}
            attributionControl={false}
            ref={mapRef}
          >
            {/* Map Controller for facility selection */}
            <MapController selectedFacilityId={selectedBuilding} facilities={validFacilities} />
            
            {/* Use a cleaner tile layer with minimal text */}
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              attribution=''
            />
            
            {validFacilities.map((facility) => {
              // Extract coordinates from the facility location
              const [lng, lat] = facility.location.coordinates;
              const isBooked = isFacilityCurrentlyBooked(facility._id);
              
              return (
                <Marker
                  key={facility._id}
                  position={[lat, lng]}
                  icon={createCustomIcon(facility.status)}
                >
                  <Popup>
                    <div className="p-2 min-w-[200px]">
                      <h3 className="font-semibold text-lg mb-2">{facility.name}</h3>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            facility.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {facility.status}
                          </span>
                        </div>
                        {isBooked && (
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-red-500" />
                            <span className="text-xs text-red-600 font-medium">Currently Booked</span>
                          </div>
                        )}
                        <div className="text-xs text-gray-500">
                          Coordinates: {lat.toFixed(6)}, {lng.toFixed(6)}
                        </div>
                      </div>
                      <button
                        onClick={() => onFacilityClick && onFacilityClick(facility)}
                        className="mt-3 w-full px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                      >
                        View Details
                      </button>
                    </div>
                  </Popup>
                  <Tooltip direction="top" offset={[0, -30]} opacity={1}>
                    <span className="font-medium">{facility.name}</span>
                    {isBooked && <span className="text-red-500 ml-1">●</span>}
                  </Tooltip>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      </div>
    </>
  );
};

export default MapView;