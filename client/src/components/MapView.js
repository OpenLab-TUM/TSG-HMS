import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { Navigation, Users, Clock, Info, Calendar, Plus } from 'lucide-react';
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

const MapView = ({ facilities, bookings, onFacilityClick, onBookingClick, onNewBooking }) => {
  const [selectedBuilding, setSelectedBuilding] = useState('all');
  
  // TSG Heilbronn coordinates (example - replace with actual)
  const center = [49.1427, 9.2109];
  
  // Create custom icons for different facility statuses
  const createCustomIcon = (status) => {
    const colors = {
      available: '#10b981',
      booked: '#f59e0b',
      maintenance: '#ef4444'
    };
    
    const svgIcon = L.divIcon({
      html: `
        <div style="background-color: ${colors[status]}; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">
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

  // Mock facility locations (replace with actual coordinates)
  const facilityLocations = [
    { ...facilities[0], lat: 49.1425, lng: 9.2105 },
    { ...facilities[1], lat: 49.1428, lng: 9.2110 },
    { ...facilities[2], lat: 49.1430, lng: 9.2108 },
    { ...facilities[3], lat: 49.1427, lng: 9.2115 },
    { ...facilities[4], lat: 49.1423, lng: 9.2112 },
    { ...facilities[5], lat: 49.1432, lng: 9.2107 },
  ];

  return (
    <>
      <style>{mapStyles}</style>
      <div className="h-full w-full bg-white overflow-hidden relative">
        {/* Floating Legend */}
        <div className="absolute top-4 right-4 z-[1000] bg-white rounded-lg shadow-lg border border-gray-200 p-3">
          <div className="text-sm font-medium text-gray-700 mb-2">Facility Status</div>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-xs text-gray-600">Available</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
              <span className="text-xs text-gray-600">Booked</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-xs text-gray-600">Maintenance</span>
            </div>
          </div>
        </div>
        
        {/* Map Container - Full Screen */}
        <div className="h-full w-full">
        <MapContainer
          center={center}
          zoom={16}
          style={{ height: '100%', width: '100%' }}
          className="z-0"
          zoomControl={true}
          attributionControl={false}
        >
          {/* Use a cleaner tile layer with minimal text */}
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution=''
          />
          
          {facilityLocations.map((facility) => (
            <Marker
              key={facility.id}
              position={[facility.lat, facility.lng]}
              icon={createCustomIcon(facility.status)}
            >
              <Popup>
                <div className="p-2 min-w-[200px]">
                  <h3 className="font-semibold text-lg mb-2">{facility.name}</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-gray-500" />
                      <span>Capacity: {facility.capacity}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Info className="w-4 h-4 text-gray-500" />
                      <span>Size: {facility.size}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        facility.status === 'available' ? 'bg-green-100 text-green-800' :
                        facility.status === 'booked' ? 'bg-amber-100 text-amber-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {facility.status}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => onFacilityClick(facility)}
                    className="mt-3 w-full px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                  >
                    View Details
                  </button>
                </div>
              </Popup>
              <Tooltip direction="top" offset={[0, -30]} opacity={1}>
                <span className="font-medium">{facility.name}</span>
              </Tooltip>
            </Marker>
          ))}
        </MapContainer>
      </div>
      </div>
    </>
  );
};

export default MapView;