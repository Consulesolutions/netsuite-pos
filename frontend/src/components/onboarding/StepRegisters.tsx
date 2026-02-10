import { useState, useEffect } from 'react';
import { PlusIcon, TrashIcon, ComputerDesktopIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { api } from '../../services/api';
import toast from 'react-hot-toast';

interface Location {
  id: string;
  name: string;
}

interface Register {
  id: string;
  name: string;
  locationId: string;
  location?: Location;
}

interface StepRegistersProps {
  onNext: () => void;
}

export default function StepRegisters({ onNext }: StepRegistersProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [registers, setRegisters] = useState<Register[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newRegister, setNewRegister] = useState({ name: '', locationId: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [locRes, regRes] = await Promise.all([
        api.get('/inventory/locations'),
        api.get('/inventory/registers'),
      ]);
      setLocations(locRes.data || []);
      setRegisters(regRes.data || []);
      if (locRes.data?.length > 0) {
        setNewRegister({ ...newRegister, locationId: locRes.data[0].id });
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddRegister = async () => {
    if (!newRegister.name || !newRegister.locationId) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsAdding(true);
    try {
      const response = await api.post('/inventory/registers', newRegister);
      setRegisters([...registers, response.data]);
      setNewRegister({ name: '', locationId: locations[0]?.id || '' });
      toast.success('Register added');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add register');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteRegister = async (id: string) => {
    if (!confirm('Are you sure you want to delete this register?')) return;

    try {
      await api.delete(`/inventory/registers/${id}`);
      setRegisters(registers.filter((r) => r.id !== id));
      toast.success('Register deleted');
    } catch (error) {
      toast.error('Failed to delete register');
    }
  };

  const getLocationName = (locationId: string) => {
    return locations.find((l) => l.id === locationId)?.name || 'Unknown';
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
        <h2 className="text-xl font-bold text-gray-900">Configure Registers</h2>
        <p className="text-gray-500 mt-1">
          Add the POS terminals/registers for each of your locations.
        </p>
      </div>

      {/* Existing Registers */}
      {registers.length > 0 && (
        <div className="space-y-3">
          {registers.map((register) => (
            <div
              key={register.id}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <ComputerDesktopIcon className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{register.name}</p>
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <MapPinIcon className="w-4 h-4" />
                    {getLocationName(register.locationId)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleDeleteRegister(register.id)}
                className="p-2 text-gray-400 hover:text-red-600"
              >
                <TrashIcon className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add New Register */}
      <div className="border border-dashed border-gray-300 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
          <PlusIcon className="w-5 h-5" />
          Add New Register
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Register Name *
            </label>
            <input
              type="text"
              value={newRegister.name}
              onChange={(e) => setNewRegister({ ...newRegister, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="Register 1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location *
            </label>
            <select
              value={newRegister.locationId}
              onChange={(e) => setNewRegister({ ...newRegister, locationId: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={handleAddRegister}
          disabled={isAdding || locations.length === 0}
          className="mt-4 btn-secondary"
        >
          {isAdding ? 'Adding...' : 'Add Register'}
        </button>
        {locations.length === 0 && (
          <p className="text-sm text-red-600 mt-2">
            Please add a location first before adding registers.
          </p>
        )}
      </div>

      {/* Next Button */}
      <div className="flex justify-end pt-4 border-t border-gray-200">
        <button
          onClick={onNext}
          disabled={registers.length === 0}
          className="btn-primary"
        >
          {registers.length === 0 ? 'Add at least one register' : 'Continue'}
        </button>
      </div>
    </div>
  );
}
