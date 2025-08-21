/* eslint-disable no-unused-vars */
import React, { useMemo, useState } from 'react';
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

const MapView = ({ facilities = [], bookings = [], onFacilityClick }) => {
  const [selectedBuilding, setSelectedBuilding] = useState('all');
  
  // TSG Heilbronn coordinates (example - replace with actual)
  const center = [49.1427, 9.2109];
  
  // Create custom icons for facility status (open/closed only)
  const createCustomIcon = (status) => {
    const colors = {
      open: '#10b981',
      closed: '#ef4444'
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

  // Compute marker positions in a small grid around center (fallback until real coords are provided)
  const facilityLocations = useMemo(() => {
    const deltaLat = 0.00035;
    const deltaLng = 0.00045;
    const cols = 4;

    return (facilities || []).map((f, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const lat = center[0] + (row - 1) * deltaLat;
      const lng = center[1] + (col - 1.5) * deltaLng;

      // Normalize facility status strictly to open/closed
      const markerStatus = ((f.status || '').toLowerCase() === 'open') ? 'open' : 'closed';

      return {
        ...f,
        lat,
        lng,
        markerStatus,
      };
    });
  }, [facilities]);

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
              <span className="text-xs text-gray-600">Open</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-xs text-gray-600">Closed</span>
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
              key={facility._id}
              position={[facility.lat, facility.lng]}
              icon={createCustomIcon(facility.markerStatus)}
            >
              <Popup>
                <div className="p-2 min-w-[200px]">
                  <h3 className="font-semibold text-lg mb-2">{facility.name}</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        facility.markerStatus === 'open' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {facility.markerStatus}
                      </span>
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