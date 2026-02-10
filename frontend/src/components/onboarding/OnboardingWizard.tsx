import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckIcon } from '@heroicons/react/24/solid';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../services/api';
import toast from 'react-hot-toast';

import StepLocations from './StepLocations';
import StepRegisters from './StepRegisters';
import StepInviteUsers from './StepInviteUsers';

const steps = [
  { id: 1, name: 'Set Up Locations', description: 'Add your store locations' },
  { id: 2, name: 'Configure Registers', description: 'Set up POS terminals' },
  { id: 3, name: 'Invite Team', description: 'Add your staff members' },
];

export default function OnboardingWizard() {
  const navigate = useNavigate();
  const { user, tenant } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(user?.onboardingStep || 1);

  const updateOnboardingStep = async (step: number, complete = false) => {
    try {
      await api.patch('/invitations/tenant/onboarding', {
        step,
        complete,
      });
    } catch (error) {
      console.error('Failed to update onboarding step:', error);
    }
  };

  const handleNext = async () => {
    if (currentStep < steps.length) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      await updateOnboardingStep(nextStep);
    } else {
      // Complete onboarding
      await updateOnboardingStep(currentStep, true);
      toast.success('Setup complete! Welcome to NetSuite POS.');
      navigate('/app/pos');
    }
  };

  const handleSkip = async () => {
    await updateOnboardingStep(currentStep, true);
    toast.success('You can complete setup later in Settings.');
    navigate('/app/pos');
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <StepLocations onNext={handleNext} />;
      case 2:
        return <StepRegisters onNext={handleNext} />;
      case 3:
        return <StepInviteUsers onNext={handleNext} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">POS</span>
            </div>
            <div>
              <h1 className="font-semibold text-gray-900">{tenant?.name}</h1>
              <p className="text-sm text-gray-500">Setup Wizard</p>
            </div>
          </div>
          <button
            onClick={handleSkip}
            className="text-gray-500 hover:text-gray-700"
          >
            Skip for now
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Progress Steps */}
        <nav className="mb-8">
          <ol className="flex items-center">
            {steps.map((step, index) => (
              <li key={step.id} className={`flex items-center ${index < steps.length - 1 ? 'flex-1' : ''}`}>
                <div className="flex items-center">
                  <span
                    className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                      currentStep > step.id
                        ? 'bg-primary-600 border-primary-600 text-white'
                        : currentStep === step.id
                        ? 'border-primary-600 text-primary-600'
                        : 'border-gray-300 text-gray-500'
                    }`}
                  >
                    {currentStep > step.id ? (
                      <CheckIcon className="w-5 h-5" />
                    ) : (
                      step.id
                    )}
                  </span>
                  <div className="ml-3 hidden sm:block">
                    <p className={`text-sm font-medium ${currentStep >= step.id ? 'text-gray-900' : 'text-gray-500'}`}>
                      {step.name}
                    </p>
                    <p className="text-xs text-gray-500">{step.description}</p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-4 ${currentStep > step.id ? 'bg-primary-600' : 'bg-gray-300'}`} />
                )}
              </li>
            ))}
          </ol>
        </nav>

        {/* Step Content */}
        <div className="card p-6">{renderStep()}</div>
      </div>
    </div>
  );
}
