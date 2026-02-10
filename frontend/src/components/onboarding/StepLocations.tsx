import { useState, useEffect } from 'react';
import { PlusIcon, TrashIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { api } from '../../services/api';
import toast from 'react-hot-toast';

interface Location {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
}

interface StepLocationsProps {
  onNext: () => void;
}

export default function StepLocations({ onNext }: StepLocationsProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newLocation, setNewLocation] = useState({ name: '', address: '', phone: '' });

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      // We'll need to add this endpoint or use the existing inventory/locations
      const response = await api.get('/inventory/locations');
      setLocations(response.data || []);
    } catch (error) {
      console.error('Failed to load locations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddLocation = async () => {
    if (!newLocation.name) {
      toast.error('Please enter a location name');
      return;
    }

    setIsAdding(true);
    try {
      const response = await api.post('/inventory/locations', newLocation);
      setLocations([...locations, response.data]);
      setNewLocation({ name: '', address: '', phone: '' });
      toast.success('Location added');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add location');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteLocation = async (id: string) => {
    if (!confirm('Are you sure you want to delete this location?')) return;

    try {
      await api.delete(`/inventory/locations/${id}`);
      setLocations(locations.filter((l) => l.id !== id));
      toast.success('Location deleted');
    } catch (error) {
      toast.error('Failed to delete location');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Set Up Your Locations</h2>
        <p className="text-gray-500 mt-1">
          Add the physical store locations where you'll be using the POS system.
        </p>
      </div>

      {/* Existing Locations */}
      {locations.length > 0 && (
        <div className="space-y-3">
          {locations.map((location) => (
            <div
              key={location.id}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                  <MapPinIcon className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{location.name}</p>
                  {location.address && (
                    <p className="text-sm text-gray-500">{location.address}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleDeleteLocation(location.id)}
                className="p-2 text-gray-400 hover:text-red-600"
              >
                <TrashIcon className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add New Location */}
      <div className="border border-dashed border-gray-300 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
          <PlusIcon className="w-5 h-5" />
          Add New Location
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location Name *
            </label>
            <input
              type="text"
              value={newLocation.name}
              onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="Main Store"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <input
              type="text"
              value={newLocation.address}
              onChange={(e) => setNewLocation({ ...newLocation, address: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="123 Main St, City"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="tel"
              value={newLocation.phone}
              onChange={(e) => setNewLocation({ ...newLocation, phone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="(555) 123-4567"
            />
          </div>
        </div>
        <button
          onClick={handleAddLocation}
          disabled={isAdding}
          className="mt-4 btn-secondary"
        >
          {isAdding ? 'Adding...' : 'Add Location'}
        </button>
      </div>

      {/* Next Button */}
      <div className="flex justify-end pt-4 border-t border-gray-200">
        <button
          onClick={onNext}
          disabled={locations.length === 0}
          className="btn-primary"
        >
          {locations.length === 0 ? 'Add at least one location' : 'Continue'}
        </button>
      </div>
    </div>
  );
}
