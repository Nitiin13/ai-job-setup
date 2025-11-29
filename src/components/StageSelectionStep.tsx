import { Lock, Unlock, GripVertical } from 'lucide-react';
import { useState } from 'react';
import { JobSetupData, StageConfig } from '../types/job-setup';

interface StageSelectionStepProps {
  jobData: JobSetupData;
  setJobData: (data: JobSetupData) => void;
  onNext: () => void;
  onBack: () => void;
}

interface DraggableStageCardProps {
  stage: StageConfig;
  index: number;
  onToggle: () => void;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (index: number) => void;
}

function DraggableStageCard({ stage, index, onToggle, onDragStart, onDragOver, onDrop }: DraggableStageCardProps) {
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div
      draggable={!stage.locked}
      onDragStart={() => {
        setIsDragging(true);
        onDragStart(index);
      }}
      onDragEnd={() => setIsDragging(false)}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver(e, index);
      }}
      onDrop={() => onDrop(index)}
      style={{ opacity: isDragging ? 0.4 : 1 }}
      className={`p-4 border-2 rounded-lg transition-all ${
        stage.enabled
          ? 'border-blue-500 bg-blue-50'
          : 'border-slate-200 bg-white hover:border-slate-300'
      } ${stage.locked ? 'opacity-75' : ''}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {!stage.locked && (
            <div className="cursor-move text-slate-400 hover:text-slate-600">
              <GripVertical className="w-5 h-5" />
            </div>
          )}
          <div
            onClick={onToggle}
            className="cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                  stage.enabled
                    ? 'bg-blue-600 border-blue-600'
                    : 'bg-white border-slate-300'
                }`}
              >
                {stage.enabled && (
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div>
                <h3 className="text-slate-900">{stage.name}</h3>
                {stage.locked && (
                  <p className="text-xs text-slate-500">Mandatory stage</p>
                )}
              </div>
            </div>
          </div>
        </div>
        <div>
          {stage.locked ? (
            <Lock className="w-5 h-5 text-slate-400" />
          ) : (
            <Unlock className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </div>
    </div>
  );
}

export function StageSelectionStep({ jobData, setJobData, onNext, onBack }: StageSelectionStepProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [stageOrder, setStageOrder] = useState(['resume_screening', 'audio_interview', 'assignment', 'personal_interview', 'founders_round', 'rejected']);
  
  const stages = stageOrder.map(id => jobData.stages[id as keyof typeof jobData.stages]);

  const toggleStage = (stageId: string) => {
    const stage = jobData.stages[stageId as keyof typeof jobData.stages];
    if (stage.locked) return;

    setJobData({
      ...jobData,
      stages: {
        ...jobData.stages,
        [stageId]: {
          ...stage,
          enabled: !stage.enabled,
        },
      },
    });
  };

  const handleDragStart = (index: number) => {
    // Don't allow dragging locked stages (resume_screening and rejected)
    if (stages[index].locked) return;
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    // Don't allow dropping on locked positions
    if (index === 0 || index === stages.length - 1) return;
    if (draggedIndex === null || draggedIndex === index) return;
    if (stages[index].locked) return;

    const newOrder = [...stageOrder];
    const draggedId = newOrder[draggedIndex];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(index, 0, draggedId);

    setStageOrder(newOrder);
    setDraggedIndex(index);
  };

  const handleDrop = (index: number) => {
    setDraggedIndex(null);
  };

  const enabledStages = stages.filter((s) => s.enabled && s.id !== 'rejected');
  const canProceed = enabledStages.length >= 2; // At least resume_screening + one other

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-slate-900">Select Interview Stages</h2>
        <p className="text-slate-600">
          Choose the stages for your hiring pipeline. Resume Screening and Rejected are mandatory. Drag to reorder stages.
        </p>
      </div>

      <div className="grid gap-4">
        {stages.filter(s => s.id !== 'rejected').map((stage, index) => (
          <DraggableStageCard
            key={stage.id}
            stage={stage}
            index={index}
            onToggle={() => toggleStage(stage.id)}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          />
        ))}
      </div>

      {/* Summary */}
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-900">
          <strong>Selected Pipeline:</strong> {enabledStages.map(s => s.name).join(' → ')} → Rejected
        </p>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <button
          onClick={onBack}
          className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!canProceed}
          className={`px-6 py-3 rounded-lg transition-colors ${
            canProceed
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          Continue to Configure Rubrics
        </button>
      </div>
    </div>
  );
}