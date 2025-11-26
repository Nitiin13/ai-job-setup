import { useState } from 'react';
import { Check } from 'lucide-react';
import { JobSetupData } from '../types/job-setup';
import { JobDetailsStep } from './JobDetailsStep';
import { StageSelectionStep } from './StageSelectionStep';
import { RubricConfigurationStep } from './RubricConfigurationStep';
import { ReviewStep } from './ReviewStep';

const STEPS = [
  { id: 1, name: 'Job Details', description: 'Designation & Job Description' },
  { id: 2, name: 'Select Stages', description: 'Choose interview rounds' },
  { id: 3, name: 'Configure Rubrics', description: 'AI-powered evaluation criteria' },
  { id: 4, name: 'Review & Submit', description: 'Final configuration' },
];

export function JobSetupWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [jobData, setJobData] = useState<JobSetupData>({
    designation: '',
    jobDescriptionPdf: null,
    stages: {
      resume_screening: {
        id: 'resume_screening',
        name: 'Resume Screening',
        enabled: true,
        locked: true,
        evaluationRubrics: [],
        chatHistory: [],
      },
      audio_interview: {
        id: 'audio_interview',
        name: 'Audio Interview',
        enabled: false,
        locked: false,
        evaluationRubrics: [],
        questions: [],
        chatHistory: [],
      },
      assignment: {
        id: 'assignment',
        name: 'Assignment',
        enabled: false,
        locked: false,
        evaluationRubrics: [],
        chatHistory: [],
      },
      personal_interview: {
        id: 'personal_interview',
        name: 'Personal Interview',
        enabled: false,
        locked: false,
        evaluationRubrics: [],
        chatHistory: [],
      },
      founders_round: {
        id: 'founders_round',
        name: 'Founders Round',
        enabled: false,
        locked: false,
        evaluationRubrics: [],
        chatHistory: [],
      },
      rejected: {
        id: 'rejected',
        name: 'Rejected',
        enabled: true,
        locked: true,
        evaluationRubrics: [],
        chatHistory: [],
      },
    },
  });

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-slate-900">AI-Powered Job Setup</h1>
          <p className="text-slate-600">Configure your hiring pipeline with intelligent evaluation criteria</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all ${
                      currentStep > step.id
                        ? 'bg-green-500 text-white'
                        : currentStep === step.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {currentStep > step.id ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <span>{step.id}</span>
                    )}
                  </div>
                  <div className="text-center">
                    <p className={`text-sm ${currentStep >= step.id ? 'text-slate-900' : 'text-slate-500'}`}>
                      {step.name}
                    </p>
                    <p className="text-xs text-slate-500 hidden md:block">{step.description}</p>
                  </div>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 mx-2 mb-8 transition-all ${
                      currentStep > step.id ? 'bg-green-500' : 'bg-slate-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {currentStep === 1 && (
            <JobDetailsStep
              jobData={jobData}
              setJobData={setJobData}
              onNext={handleNext}
            />
          )}
          {currentStep === 2 && (
            <StageSelectionStep
              jobData={jobData}
              setJobData={setJobData}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}
          {currentStep === 3 && (
            <RubricConfigurationStep
              jobData={jobData}
              setJobData={setJobData}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}
          {currentStep === 4 && (
            <ReviewStep
              jobData={jobData}
              onBack={handleBack}
            />
          )}
        </div>
      </div>
    </div>
  );
}
