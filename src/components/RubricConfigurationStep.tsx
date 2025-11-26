import { useState } from 'react';
import { JobSetupData } from '../types/job-setup';
import { AIRubricChat } from './AIRubricChat';
import { ChevronRight } from 'lucide-react';

interface RubricConfigurationStepProps {
  jobData: JobSetupData;
  setJobData: (data: JobSetupData) => void;
  onNext: () => void;
  onBack: () => void;
}

export function RubricConfigurationStep({
  jobData,
  setJobData,
  onNext,
  onBack,
}: RubricConfigurationStepProps) {
  const enabledStages = Object.values(jobData.stages).filter(
    (s) => s.enabled && s.id !== 'rejected'
  );
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const currentStage = enabledStages[currentStageIndex];

  const handleStageComplete = () => {
    if (currentStageIndex < enabledStages.length - 1) {
      setCurrentStageIndex(currentStageIndex + 1);
    } else {
      onNext();
    }
  };

  const handleStagePrevious = () => {
    if (currentStageIndex > 0) {
      setCurrentStageIndex(currentStageIndex - 1);
    } else {
      onBack();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-slate-900">Configure Evaluation Rubrics</h2>
        <p className="text-slate-600">
          AI will suggest evaluation criteria for each stage. Chat to customize or add new rubrics.
        </p>
      </div>

      {/* Stage Progress */}
      <div className="flex items-center gap-2 p-4 bg-slate-50 rounded-lg">
        <span className="text-sm text-slate-600">Configuring:</span>
        {enabledStages.map((stage, index) => (
          <div key={stage.id} className="flex items-center">
            <span
              className={`px-3 py-1 rounded-full text-sm ${
                index === currentStageIndex
                  ? 'bg-blue-600 text-white'
                  : index < currentStageIndex
                  ? 'bg-green-500 text-white'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {stage.name}
            </span>
            {index < enabledStages.length - 1 && (
              <ChevronRight className="w-4 h-4 text-slate-400 mx-1" />
            )}
          </div>
        ))}
      </div>

      {/* AI Chat Interface */}
      <AIRubricChat
        stage={currentStage}
        jobData={jobData}
        setJobData={setJobData}
        onNext={handleStageComplete}
        onBack={handleStagePrevious}
        isLastStage={currentStageIndex === enabledStages.length - 1}
      />
    </div>
  );
}
