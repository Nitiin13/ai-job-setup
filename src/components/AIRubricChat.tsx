import { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Plus, Trash2, Edit2, Check, X, GripVertical } from 'lucide-react';
import { JobSetupData, StageConfig, EvaluationRubric, ChatMessage } from '../types/job-setup';
import { aiAPI } from '../services/api';

interface AIRubricChatProps {
  stage: StageConfig;
  jobData: JobSetupData;
  setJobData: (data: JobSetupData) => void;
  onNext: () => void;
  onBack: () => void;
  isLastStage: boolean;
}

interface DraggableQuestionProps {
  question: any;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  isEditing: boolean;
  editedQuestion: { id: string; question: string; rubricId: string } | null;
  onSave: () => void;
  onCancel: () => void;
  updateField: (field: string, value: any) => void;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (index: number) => void;
}

function DraggableQuestion({ 
  question, 
  index, 
  onEdit, 
  onDelete,
  isEditing,
  editedQuestion,
  onSave,
  onCancel,
  updateField,
  onDragStart,
  onDragOver,
  onDrop,
}: DraggableQuestionProps) {
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div
      draggable={!isEditing}
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
      className="p-3 bg-white rounded-lg border border-purple-200"
    >
      {isEditing ? (
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-slate-600 mb-1">Question {index + 1}</label>
            <textarea
              value={editedQuestion?.question || ''}
              onChange={(e) => updateField('question', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={onCancel}
              className="px-3 py-1 text-sm border border-slate-300 text-slate-700 rounded hover:bg-slate-50 transition-colors flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
            <button
              onClick={onSave}
              className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors flex items-center gap-1"
            >
              <Check className="w-4 h-4" />
              Save
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3">
          <div className="cursor-move text-slate-400 hover:text-slate-600 pt-1">
            <GripVertical className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-slate-700">
              <span className="text-purple-600 mr-2">Q{index + 1}.</span>
              {question.question}
            </p>
          </div>
          <div className="flex gap-1">
            <button
              onClick={onEdit}
              className="p-1 text-slate-400 hover:text-purple-500 transition-colors"
              title="Edit question"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={onDelete}
              className="p-1 text-slate-400 hover:text-red-500 transition-colors"
              title="Delete question"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function AIRubricChat({ stage, jobData, setJobData, onNext, onBack, isLastStage }: AIRubricChatProps) {
  const [userMessage, setUserMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [editingRubricId, setEditingRubricId] = useState<string | null>(null);
  const [editedRubric, setEditedRubric] = useState<EvaluationRubric | null>(null);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editedQuestion, setEditedQuestion] = useState<{ id: string; question: string; rubricId: string } | null>(null);
  const [currentSubStep, setCurrentSubStep] = useState<'rubrics' | 'questions'>('rubrics');
  const [draggedQuestionIndex, setDraggedQuestionIndex] = useState<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Initialize with AI suggestions on first load
  useEffect(() => {
    if (stage.evaluationRubrics.length === 0 && stage.chatHistory.length === 0) {
      generateInitialRubrics();
    }
    // Reset to rubrics step when stage changes
    setCurrentSubStep('rubrics');
  }, [stage.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [stage.chatHistory]);

  const generateInitialRubrics = async () => {
    setIsLoading(true);

    try {
      // Call backend API to generate rubrics using Gemini AI
      const result = await aiAPI.generateRubrics({
        stageId: stage.id,
        designation: jobData.designation,
        jobDescription: jobData.jobDescriptionPdf?.parsedText,
        existingRubrics: stage.evaluationRubrics,
      });

      if (result.success) {
        const aiMessage: ChatMessage = {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: result.data.message,
          timestamp: new Date(),
        };

        // Update stage with rubrics
        const updatedStage = {
          ...stage,
          evaluationRubrics: result.data.rubrics,
          chatHistory: [aiMessage],
        };

        updateStage(updatedStage);
        setIsLoading(false);
      }
    } catch (error: any) {
      console.error('Error generating rubrics:', error);
      
      // Fallback to default rubrics
      const rubrics = getDefaultRubricsForStage(stage.id, jobData.designation);
      const aiMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: `I've prepared evaluation rubrics for ${stage.name}. You can ask me to modify these rubrics, add new ones, or remove any that don't fit your needs.`,
        timestamp: new Date(),
      };

      updateStage({
        ...stage,
        evaluationRubrics: rubrics,
        chatHistory: [aiMessage],
      });
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!userMessage.trim()) return;

    const newUserMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    };

    updateStage({
      ...stage,
      chatHistory: [...stage.chatHistory, newUserMessage],
    });

    setUserMessage('');
    setIsLoading(true);

    try {
      // If in questions step, handle question modification requests
      if (currentSubStep === 'questions' && stage.id === 'audio_interview') {
        const lowerMessage = userMessage.toLowerCase();
        
        // Check if asking to regenerate questions
        if (lowerMessage.includes('regenerate') || lowerMessage.includes('generate new') || lowerMessage.includes('different question')) {
          const questionsResult = await aiAPI.generateQuestions({
            stageId: stage.id,
            designation: jobData.designation,
            rubrics: stage.evaluationRubrics,
            jobDescription: jobData.jobDescriptionPdf?.parsedText,
          });

          if (questionsResult.success) {
            const aiMessage: ChatMessage = {
              id: `msg-${Date.now() + 1}`,
              role: 'assistant',
              content: "I've generated a new set of 10 interview questions based on your evaluation rubrics.",
              timestamp: new Date(),
            };

            updateStage({
              ...stage,
              chatHistory: [...stage.chatHistory, newUserMessage, aiMessage],
              questions: questionsResult.data.questions,
            });
            setIsLoading(false);
            return;
          }
        }

        // Otherwise, use general chat for question modifications
        const result = await aiAPI.chatWithAI({
          message: userMessage,
          stageId: stage.id,
          designation: jobData.designation,
          currentRubrics: stage.evaluationRubrics,
          chatHistory: stage.chatHistory,
        });

        if (result.success) {
          const aiMessage: ChatMessage = {
            id: `msg-${Date.now() + 1}`,
            role: 'assistant',
            content: result.data.message,
            timestamp: new Date(),
          };

          updateStage({
            ...stage,
            chatHistory: [...stage.chatHistory, newUserMessage, aiMessage],
            questions: result.data.questions || stage.questions,
          });
        }
      } else {
        // Handle rubric modifications
        const result = await aiAPI.chatWithAI({
          message: userMessage,
          stageId: stage.id,
          designation: jobData.designation,
          currentRubrics: stage.evaluationRubrics,
          chatHistory: stage.chatHistory,
        });

        if (result.success) {
          const aiMessage: ChatMessage = {
            id: `msg-${Date.now() + 1}`,
            role: 'assistant',
            content: result.data.message,
            timestamp: new Date(),
          };

          updateStage({
            ...stage,
            chatHistory: [...stage.chatHistory, newUserMessage, aiMessage],
            evaluationRubrics: result.data.updatedRubrics || stage.evaluationRubrics,
            questions: result.data.questions || stage.questions,
          });
        }
      }
    } catch (error: any) {
      console.error('Error chatting with AI:', error);
      
      // Fallback response
      const aiMessage: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: currentSubStep === 'questions'
          ? "I understand you'd like to modify the questions. Could you please provide more specific details? I can help you regenerate questions or customize specific ones."
          : "I understand you'd like to make changes. Could you please provide more specific details? I can help you add, modify, or remove rubrics.",
        timestamp: new Date(),
      };

      updateStage({
        ...stage,
        chatHistory: [...stage.chatHistory, newUserMessage, aiMessage],
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateStage = (updatedStage: StageConfig) => {
    setJobData({
      ...jobData,
      stages: {
        ...jobData.stages,
        [stage.id]: updatedStage,
      },
    });
  };

  const removeRubric = (rubricId: string) => {
    updateStage({
      ...stage,
      evaluationRubrics: stage.evaluationRubrics.filter((r) => r.id !== rubricId),
    });
  };

  const startEditingRubric = (rubric: EvaluationRubric) => {
    setEditingRubricId(rubric.id);
    setEditedRubric({ ...rubric });
  };

  const cancelEditingRubric = () => {
    setEditingRubricId(null);
    setEditedRubric(null);
  };

  const saveEditedRubric = () => {
    if (!editedRubric) return;

    updateStage({
      ...stage,
      evaluationRubrics: stage.evaluationRubrics.map((r) =>
        r.id === editedRubric.id ? editedRubric : r
      ),
    });

    setEditingRubricId(null);
    setEditedRubric(null);
  };

  const updateEditedRubricField = (field: keyof EvaluationRubric, value: any) => {
    if (!editedRubric) return;
    setEditedRubric({
      ...editedRubric,
      [field]: value,
    });
  };

  const startEditingQuestion = (question: any) => {
    setEditingQuestionId(question.id);
    setEditedQuestion({ ...question });
  };

  const cancelEditingQuestion = () => {
    setEditingQuestionId(null);
    setEditedQuestion(null);
  };

  const saveEditedQuestion = () => {
    if (!editedQuestion || !stage.questions) return;

    updateStage({
      ...stage,
      questions: stage.questions.map((q) =>
        q.id === editedQuestion.id ? editedQuestion : q
      ),
    });

    setEditingQuestionId(null);
    setEditedQuestion(null);
  };

  const removeQuestion = (questionId: string) => {
    if (!stage.questions) return;
    
    updateStage({
      ...stage,
      questions: stage.questions.filter((q) => q.id !== questionId),
    });
  };

  const updateEditedQuestionField = (field: string, value: any) => {
    if (!editedQuestion) return;
    setEditedQuestion({
      ...editedQuestion,
      [field]: value,
    });
  };

  const moveQuestion = (dragIndex: number, hoverIndex: number) => {
    if (!stage.questions) return;
    
    const draggedQuestion = stage.questions[dragIndex];
    const newQuestions = [...stage.questions];
    newQuestions.splice(dragIndex, 1);
    newQuestions.splice(hoverIndex, 0, draggedQuestion);

    updateStage({
      ...stage,
      questions: newQuestions,
    });
  };

  const handleProceedToQuestions = async () => {
    setIsLoading(true);
    setCurrentSubStep('questions');

    try {
      const questionsResult = await aiAPI.generateQuestions({
        stageId: stage.id,
        designation: jobData.designation,
        rubrics: stage.evaluationRubrics,
        jobDescription: jobData.jobDescriptionPdf?.parsedText,
      });

      if (questionsResult.success) {
        const questionsMessage: ChatMessage = {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: questionsResult.data.message,
          timestamp: new Date(),
        };

        updateStage({
          ...stage,
          chatHistory: [...stage.chatHistory, questionsMessage],
          questions: questionsResult.data.questions,
        });
      }
    } catch (error) {
      console.error('Error generating questions:', error);
      
      // Fallback to default questions
      const defaultQuestions = getDefaultQuestionsForStage(stage.id, stage.evaluationRubrics);
      const questionsMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: "I've generated 10 interview questions based on your evaluation rubrics.",
        timestamp: new Date(),
      };

      updateStage({
        ...stage,
        chatHistory: [...stage.chatHistory, questionsMessage],
        questions: defaultQuestions,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToRubrics = () => {
    setCurrentSubStep('rubrics');
  };

  const canProceed = stage.evaluationRubrics.length > 0;
  const canProceedToNext = stage.id === 'audio_interview' 
    ? (currentSubStep === 'questions' && stage.questions && stage.questions.length > 0)
    : canProceed;

  // Determine if button should be enabled
  const isButtonEnabled = stage.id === 'audio_interview'
    ? (currentSubStep === 'rubrics' ? canProceed : canProceedToNext)
    : canProceed;

  return (
    <div className="space-y-4">
      {/* Sub-step indicator for audio interview */}
      {stage.id === 'audio_interview' && (
        <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
              currentSubStep === 'rubrics' ? 'bg-blue-600 text-white' : 'bg-green-500 text-white'
            }`}>
              {currentSubStep === 'rubrics' ? '1' : <Check className="w-5 h-5" />}
            </div>
            <span className={`${currentSubStep === 'rubrics' ? 'text-slate-900' : 'text-slate-600'}`}>
              Configure Rubrics
            </span>
          </div>
          <div className="h-0.5 flex-1 bg-slate-300" />
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
              currentSubStep === 'questions' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'
            }`}>
              2
            </div>
            <span className={`${currentSubStep === 'questions' ? 'text-slate-900' : 'text-slate-500'}`}>
              Generate Questions
            </span>
          </div>
        </div>
      )}

      {/* Rubrics Display - Show only in rubrics step or for non-audio stages */}
      {(currentSubStep === 'rubrics' || stage.id !== 'audio_interview') && (
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
          <h3 className="text-slate-900 mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            Evaluation Rubrics for {stage.name}
          </h3>
          <div className="space-y-3">
            {stage.evaluationRubrics.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">
                AI is preparing evaluation rubrics...
              </p>
            ) : (
              stage.evaluationRubrics.map((rubric) => (
                <div key={rubric.id} className="p-3 bg-white rounded-lg border border-slate-200">
                  {editingRubricId === rubric.id ? (
                    // Edit Mode
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-slate-600 mb-1">Rubric Name</label>
                        <input
                          type="text"
                          value={editedRubric?.name || ''}
                          onChange={(e) => updateEditedRubricField('name', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-600 mb-1">Description</label>
                        <textarea
                          value={editedRubric?.description || ''}
                          onChange={(e) => updateEditedRubricField('description', e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-600 mb-1">Weight (%)</label>
                        <input
                          type="number"
                          value={editedRubric?.weight || 0}
                          onChange={(e) => updateEditedRubricField('weight', parseInt(e.target.value) || 0)}
                          min="0"
                          max="100"
                          className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={cancelEditingRubric}
                          className="px-3 py-1 text-sm border border-slate-300 text-slate-700 rounded hover:bg-slate-50 transition-colors flex items-center gap-1"
                        >
                          <X className="w-4 h-4" />
                          Cancel
                        </button>
                        <button
                          onClick={saveEditedRubric}
                          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-1"
                        >
                          <Check className="w-4 h-4" />
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Display Mode
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h4 className="text-slate-900 mb-1">{rubric.name}</h4>
                        <p className="text-sm text-slate-600">{rubric.description}</p>
                        {rubric.weight && (
                          <p className="text-xs text-slate-500 mt-1">Weight: {rubric.weight}%</p>
                        )}
                      </div>
                      {currentSubStep === 'rubrics' && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => startEditingRubric(rubric)}
                            className="p-1 text-slate-400 hover:text-blue-500 transition-colors"
                            title="Edit rubric"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => removeRubric(rubric.id)}
                            className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                            title="Delete rubric"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Questions Display - Only show in questions step */}
      {stage.id === 'audio_interview' && currentSubStep === 'questions' && (
        <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
          <h3 className="text-slate-900 mb-4">AI-Generated Interview Questions</h3>
          <p className="text-sm text-slate-600 mb-3">
            Based on the evaluation rubrics, here are 10 suggested questions for the audio interview:
          </p>
          <div className="space-y-2">
            {!stage.questions || stage.questions.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">
                Generating interview questions...
              </p>
            ) : (
              stage.questions.map((q, index) => (
                <DraggableQuestion
                  key={q.id}
                  question={q}
                  index={index}
                  onEdit={() => startEditingQuestion(q)}
                  onDelete={() => removeQuestion(q.id)}
                  isEditing={editingQuestionId === q.id}
                  editedQuestion={editedQuestion}
                  onSave={saveEditedQuestion}
                  onCancel={cancelEditingQuestion}
                  updateField={updateEditedQuestionField}
                  onDragStart={setDraggedQuestionIndex}
                  onDragOver={(e, hoverIndex) => {
                    if (draggedQuestionIndex !== null) {
                      moveQuestion(draggedQuestionIndex, hoverIndex);
                    }
                  }}
                  onDrop={() => setDraggedQuestionIndex(null)}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* Chat Interface - Show for all stages in rubrics step, and also in questions step for audio_interview */}
      {(currentSubStep === 'rubrics' || stage.id !== 'audio_interview' || currentSubStep === 'questions') && (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          {/* Chat Messages */}
          <div className="h-64 overflow-y-auto p-4 space-y-4 bg-white">
            {stage.chatHistory.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-900'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 p-3 rounded-lg">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          <div className="p-4 bg-slate-50 border-t border-slate-200">
            <div className="flex gap-2">
              <input
                type="text"
                value={userMessage}
                onChange={(e) => setUserMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={
                  currentSubStep === 'questions' 
                    ? "Ask AI to modify questions or generate new ones..." 
                    : "Ask AI to modify rubrics or add new ones..."
                }
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !userMessage.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <button
          onClick={currentSubStep === 'questions' && stage.id === 'audio_interview' ? handleBackToRubrics : onBack}
          className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
        >
          Back
        </button>
        <button
          onClick={
            stage.id === 'audio_interview' && currentSubStep === 'rubrics' 
              ? handleProceedToQuestions 
              : onNext
          }
          disabled={!isButtonEnabled}
          className={`px-6 py-3 rounded-lg transition-colors ${
            isButtonEnabled
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          {stage.id === 'audio_interview' && currentSubStep === 'rubrics'
            ? 'Generate Questions'
            : isLastStage 
            ? 'Review Configuration' 
            : 'Next Stage'}
        </button>
      </div>
    </div>
  );
}

function getDefaultRubricsForStage(stageId: string, designation: string): EvaluationRubric[] {
  const rubricsByStage: Record<string, EvaluationRubric[]> = {
    resume_screening: [
      {
        id: 'rs-1',
        name: 'Quantifiable Achievements',
        description: 'Measurable results and impact in previous roles with specific metrics and numbers',
        weight: 25,
      },
      {
        id: 'rs-2',
        name: 'Technical Skills Match',
        description: 'Alignment of technical competencies with job requirements',
        weight: 30,
      },
      {
        id: 'rs-3',
        name: 'Experience Relevance',
        description: 'Years of relevant experience and progression in similar roles',
        weight: 25,
      },
      {
        id: 'rs-4',
        name: 'Education & Certifications',
        description: 'Academic qualifications and professional certifications',
        weight: 20,
      },
    ],
    audio_interview: [
      {
        id: 'ai-1',
        name: 'Communication Skills',
        description: 'Clarity, articulation, and professional communication',
        weight: 20,
      },
      {
        id: 'ai-2',
        name: 'Technical Depth',
        description: 'Deep understanding of technical concepts and problem-solving approach',
        weight: 30,
      },
      {
        id: 'ai-3',
        name: 'Cultural Fit',
        description: 'Alignment with company values and team dynamics',
        weight: 25,
      },
      {
        id: 'ai-4',
        name: 'Motivation & Interest',
        description: 'Genuine interest in the role and long-term career goals',
        weight: 25,
      },
    ],
    assignment: [
      {
        id: 'as-1',
        name: 'Code Quality',
        description: 'Clean, maintainable, and well-structured code',
        weight: 30,
      },
      {
        id: 'as-2',
        name: 'Problem Solving',
        description: 'Approach to solving the given problem and edge case handling',
        weight: 30,
      },
      {
        id: 'as-3',
        name: 'Best Practices',
        description: 'Following industry standards and best practices',
        weight: 20,
      },
      {
        id: 'as-4',
        name: 'Documentation',
        description: 'Clear documentation and code comments',
        weight: 20,
      },
    ],
    personal_interview: [
      {
        id: 'pi-1',
        name: 'Leadership & Collaboration',
        description: 'Ability to lead projects and work effectively in teams',
        weight: 30,
      },
      {
        id: 'pi-2',
        name: 'Problem-Solving Approach',
        description: 'Methodology for tackling complex challenges',
        weight: 25,
      },
      {
        id: 'pi-3',
        name: 'Growth Mindset',
        description: 'Willingness to learn and adapt to new technologies',
        weight: 25,
      },
      {
        id: 'pi-4',
        name: 'Past Experience Discussion',
        description: 'Quality of insights from previous work experiences',
        weight: 20,
      },
    ],
    founders_round: [
      {
        id: 'fr-1',
        name: 'Strategic Thinking',
        description: 'Understanding of business context and strategic decisions',
        weight: 30,
      },
      {
        id: 'fr-2',
        name: 'Company Vision Alignment',
        description: 'Alignment with long-term company vision and goals',
        weight: 30,
      },
      {
        id: 'fr-3',
        name: 'Leadership Potential',
        description: 'Potential to take on leadership roles and grow with the company',
        weight: 25,
      },
      {
        id: 'fr-4',
        name: 'Cultural Impact',
        description: 'Potential positive impact on company culture',
        weight: 15,
      },
    ],
  };

  return rubricsByStage[stageId] || [];
}

function getDefaultQuestionsForStage(stageId: string, rubrics: EvaluationRubric[]) {
  return [
    { id: `q-${Date.now()}-1`, question: 'Can you describe a recent project where you demonstrated strong technical skills?', rubricId: rubrics[0]?.id || '' },
    { id: `q-${Date.now()}-2`, question: 'How do you approach communicating complex technical concepts to non-technical stakeholders?', rubricId: rubrics[0]?.id || '' },
    { id: `q-${Date.now()}-3`, question: 'What motivates you about this role and our company?', rubricId: rubrics[1]?.id || '' },
    { id: `q-${Date.now()}-4`, question: 'Describe a time when you had to adapt to a significant change in your work environment.', rubricId: rubrics[2]?.id || '' },
    { id: `q-${Date.now()}-5`, question: 'How do you stay updated with the latest technologies in your field?', rubricId: rubrics[0]?.id || '' },
    { id: `q-${Date.now()}-6`, question: 'Tell me about a challenging problem you solved recently and your approach.', rubricId: rubrics[1]?.id || '' },
    { id: `q-${Date.now()}-7`, question: 'How do you handle disagreements with team members?', rubricId: rubrics[2]?.id || '' },
    { id: `q-${Date.now()}-8`, question: 'What are your long-term career goals?', rubricId: rubrics[3]?.id || '' },
    { id: `q-${Date.now()}-9`, question: 'Describe your ideal work environment and team culture.', rubricId: rubrics[2]?.id || '' },
    { id: `q-${Date.now()}-10`, question: 'How do you prioritize tasks when working on multiple projects?', rubricId: rubrics[0]?.id || '' },
  ];
}

function generateAIResponse(userMessage: string, stage: StageConfig): {
  message: string;
  updatedRubrics?: EvaluationRubric[];
  questions?: any[];
} {
  const lowerMessage = userMessage.toLowerCase();

  // Handle adding new rubric
  if (lowerMessage.includes('add') && (lowerMessage.includes('rubric') || lowerMessage.includes('criteria'))) {
    const newRubric: EvaluationRubric = {
      id: `custom-${Date.now()}`,
      name: 'Account Management',
      description: 'Experience in managing client accounts and relationships',
      weight: 20,
    };
    
    return {
      message: "I've added a new rubric for 'Account Management'. This will evaluate the candidate's experience in managing client accounts and relationships. Would you like me to adjust the weights or modify any other rubrics?",
      updatedRubrics: [...stage.evaluationRubrics, newRubric],
    };
  }

  // Handle removing rubric
  if (lowerMessage.includes('remove') || lowerMessage.includes('delete')) {
    const updatedRubrics = stage.evaluationRubrics.slice(0, -1);
    return {
      message: "I've removed the last rubric. The remaining evaluation criteria have been adjusted accordingly. Is there anything else you'd like to change?",
      updatedRubrics,
    };
  }

  // Handle weight adjustment
  if (lowerMessage.includes('weight') || lowerMessage.includes('increase') || lowerMessage.includes('decrease')) {
    return {
      message: "I've adjusted the weights of the evaluation rubrics to better reflect your priorities. The rubrics are now balanced to give more emphasis to technical skills and problem-solving abilities.",
    };
  }

  // Handle question generation for audio interview
  if (stage.id === 'audio_interview' && (lowerMessage.includes('question') || lowerMessage.includes('generate'))) {
    const questions = [
      { id: 'q1', question: 'Can you describe a recent project where you demonstrated strong technical skills?', rubricId: 'ai-2' },
      { id: 'q2', question: 'How do you approach communicating complex technical concepts to non-technical stakeholders?', rubricId: 'ai-1' },
      { id: 'q3', question: 'What motivates you about this role and our company?', rubricId: 'ai-4' },
      { id: 'q4', question: 'Describe a time when you had to adapt to a significant change in your work environment.', rubricId: 'ai-3' },
      { id: 'q5', question: 'How do you stay updated with the latest technologies in your field?', rubricId: 'ai-2' },
      { id: 'q6', question: 'Tell me about a challenging problem you solved recently and your approach.', rubricId: 'ai-2' },
      { id: 'q7', question: 'How do you handle disagreements with team members?', rubricId: 'ai-3' },
      { id: 'q8', question: 'What are your long-term career goals?', rubricId: 'ai-4' },
      { id: 'q9', question: 'Describe your ideal work environment and team culture.', rubricId: 'ai-3' },
      { id: 'q10', question: 'How do you prioritize tasks when working on multiple projects?', rubricId: 'ai-1' },
    ];

    return {
      message: "I've generated 10 interview questions based on your evaluation rubrics. These questions are designed to assess communication skills, technical depth, cultural fit, and motivation. Each question maps to one or more rubrics.",
      questions,
    };
  }

  // Default response
  return {
    message: "I understand you'd like to make changes to the evaluation rubrics. I can help you:\n\n• Add new rubrics based on your specific needs\n• Remove or modify existing rubrics\n• Adjust the weights of different criteria\n• Generate interview questions (for audio interview stage)\n\nWhat would you like me to do?",
  };
}