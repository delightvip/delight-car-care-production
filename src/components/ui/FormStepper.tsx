import React from 'react';

interface Step {
  label: string;
  description?: string;
}

interface FormStepperProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (stepIndex: number) => void;
}

export const FormStepper: React.FC<FormStepperProps> = ({ steps, currentStep, onStepClick }) => {
  return (
    <div className="flex items-center justify-center mb-8">
      {steps.map((step, idx) => (
        <div key={idx} className="flex items-center">
          <button
            type="button"
            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold border-2 transition-colors duration-200 
              ${idx === currentStep ? 'bg-primary text-white border-primary' : 'bg-white text-gray-500 border-gray-300'}
              ${onStepClick ? 'cursor-pointer hover:border-primary' : 'cursor-default'}`}
            onClick={() => onStepClick && onStepClick(idx)}
            disabled={!onStepClick}
          >
            {idx + 1}
          </button>
          <div className="ml-2 mr-2 flex flex-col items-start">
            <span className={`text-sm font-medium ${idx === currentStep ? 'text-primary' : 'text-gray-600'}`}>{step.label}</span>
            {step.description && (
              <span className="text-xs text-gray-400">{step.description}</span>
            )}
          </div>
          {idx !== steps.length - 1 && (
            <div className="w-8 h-0.5 bg-gray-300" />
          )}
        </div>
      ))}
    </div>
  );
};
