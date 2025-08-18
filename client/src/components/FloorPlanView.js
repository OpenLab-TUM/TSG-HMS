import React, { useState } from 'react';
import {MapPin } from 'lucide-react';

const FloorPlanView = ({ facilities, onFacilityClick }) => {
  const [selectedFloor, setSelectedFloor] = useState('ground');
  const [hoveredFacility, setHoveredFacility] = useState(null);

  const getStatusColor = (status) => {
    switch(status) {
      case 'available': return 'bg-green-500';
      case 'booked': return 'bg-amber-500';
      case 'maintenance': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  // Define room positions on the floor plan (percentages)
  const roomLayouts = {
    ground: [
      { id: 1, name: 'Main Sports Hall', x: 10, y: 20, width: 35, height: 60 },
      { id: 5, name: 'Gymnastics Hall', x: 50, y: 20, width: 40, height: 40 },
      { id: 6, name: 'Meeting Room', x: 50, y: 65, width: 20, height: 15 },
    ],
    first: [
      { id: 2, name: 'Fitness Studio A', x: 15, y: 30, width: 25, height: 30 },
      { id: 3, name: 'Fitness Studio B', x: 45, y: 30, width: 25, height: 30 },
      { id: 4, name: 'Multi-Purpose Room', x: 75, y: 25, width: 20, height: 40 },
    ]
  };

  const currentRooms = roomLayouts[selectedFloor] || [];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Floor Selector */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex space-x-2">
              <button
                onClick={() => setSelectedFloor('ground')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  selectedFloor === 'ground'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                Ground Floor
              </button>
              <button
                onClick={() => setSelectedFloor('first')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  selectedFloor === 'first'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                First Floor
              </button>
            </div>
            
            <div className="flex items-center space-x-6 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span>Available</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-amber-500 rounded"></div>
                <span>Booked</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span>Maintenance</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floor Plan */}
      <div className="p-8">
        <div className="relative bg-gray-50 border-2 border-gray-300 rounded-lg" style={{ height: '600px' }}>
          {/* Grid lines for reference */}
          <div className="absolute inset-0 opacity-10">
            <div className="h-full w-full" style={{
              backgroundImage: 'linear-gradient(0deg, #ccc 1px, transparent 1px), linear-gradient(90deg, #ccc 1px, transparent 1px)',
              backgroundSize: '50px 50px'
            }}></div>
          </div>

          {/* Rooms */}
          {currentRooms.map((room) => {
            const facility = facilities.find(f => f.id === room.id);
            if (!facility) return null;

            return (
              <div
                key={room.id}
                className={`absolute ${getStatusColor(facility.status)} bg-opacity-80 rounded-lg border-2 border-white shadow-lg cursor-pointer transition-all hover:shadow-xl hover:z-10 transform hover:scale-105`}
                style={{
                  left: `${room.x}%`,
                  top: `${room.y}%`,
                  width: `${room.width}%`,
                  height: `${room.height}%`,
                }}
                onMouseEnter={() => setHoveredFacility(facility)}
                onMouseLeave={() => setHoveredFacility(null)}
                onClick={() => onFacilityClick(facility)}
              >
                <div className="p-4 h-full flex flex-col justify-between text-white">
                  <div>
                    <h3 className="font-semibold text-lg">{facility.name}</h3>
                    <p className="text-sm opacity-90">{facility.size}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Cap: {facility.capacity}</span>
                    <MapPin className="w-4 h-4" />
                  </div>
                </div>
              </div>
            );
          })}

          {/* Hover tooltip */}
          {hoveredFacility && (
            <div className="absolute top-4 right-4 bg-white rounded-lg shadow-xl p-4 z-20 min-w-[250px]">
              <h4 className="font-semibold text-gray-900 mb-2">{hoveredFacility.name}</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <p>Status: <span className={`font-medium ${
                  hoveredFacility.status === 'available' ? 'text-green-600' :
                  hoveredFacility.status === 'booked' ? 'text-amber-600' :
                  'text-red-600'
                }`}>{hoveredFacility.status}</span></p>
                <p>Capacity: {hoveredFacility.capacity} people</p>
                <p>Size: {hoveredFacility.size}</p>
                <p className="text-xs pt-2 text-gray-500">Click to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FloorPlanView;