import { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Edit2, Check, X, GripVertical, MessageCircle, Lightbulb, Trash2 } from 'lucide-react';
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
  const [editedQuestion, setEditedQuestion] = useState<any>(null);
  const [currentSubStep, setCurrentSubStep] = useState<'rubrics' | 'questions'>('rubrics');
  const [draggedQuestionIndex, setDraggedQuestionIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [needsClarification, setNeedsClarification] = useState(false);
  const [clarificationPrompt, setClarificationPrompt] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize conversation
  useEffect(() => {
    if (stage.evaluationRubrics.length === 0 && stage.chatHistory.length === 0) {
      generateInitialRubrics();
    }
    setCurrentSubStep('rubrics');
  }, [stage.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [stage.chatHistory]);

  // Suggestion prompts for natural conversation
  const getSuggestions = () => {
    if (currentSubStep === 'rubrics') {
      return [
        "Can you add a rubric for leadership skills?",
        "Make technical skills more important",
        "Remove the least important rubric",
        "Explain why these rubrics are chosen",
        "What's missing from this evaluation?"
      ];
    } else {
      return [
        "Generate more questions about problem-solving",
        "Make the questions more behavioral",
        "Add questions about team collaboration",
        "These questions seem too easy",
        "Can you make question 3 more specific?"
      ];
    }
  };

  const generateInitialRubrics = async () => {
    setIsLoading(true);

    const initialMessage: ChatMessage = {
      id: `msg-${Date.now()}-init`,
      role: 'assistant',
      content: `Hi! I'm here to help you set up evaluation criteria for the ${stage.name} stage. I'm analyzing the job description for ${jobData.designation} to create personalized rubrics. Give me just a moment...`,
      timestamp: new Date(),
    };

    updateStage({
      ...stage,
      chatHistory: [initialMessage],
    });

    try {
      const result = await aiAPI.generateRubrics({
        stageId: stage.id,
        designation: jobData.designation,
        jobDescription: jobData.jobDescriptionPdf?.parsedText,
        existingRubrics: [],
      });

      if (result.success) {
        const aiMessage: ChatMessage = {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: result.data.message,
          timestamp: new Date(),
        };

        updateStage({
          ...stage,
          evaluationRubrics: result.data.rubrics,
          chatHistory: [initialMessage, aiMessage],
        });

        if (result.data.needsClarification) {
          setNeedsClarification(true);
          setClarificationPrompt(result.data.clarificationQuestion);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      
      const errorMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: `I've prepared some standard evaluation rubrics for ${stage.name}. Feel free to chat with me to customize them - you can ask me to add, remove, or modify any rubric to better fit your needs.`,
        timestamp: new Date(),
      };

      updateStage({
        ...stage,
        evaluationRubrics: getDefaultRubricsForStage(stage.id),
        chatHistory: [initialMessage, errorMessage],
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!userMessage.trim() || isLoading) return;

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
    setShowSuggestions(false);
    setIsLoading(true);
    setNeedsClarification(false);

    try {
      const result = await aiAPI.chatWithAI({
        message: userMessage,
        stageId: stage.id,
        designation: jobData.designation,
        currentRubrics: stage.evaluationRubrics,
        currentQuestions: stage.questions || [],
        chatHistory: stage.chatHistory,
        context: currentSubStep,
        jobDescription: jobData.jobDescriptionPdf?.parsedText,
      });

      if (result.success) {
        const aiMessage: ChatMessage = {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          content: result.data.message,
          timestamp: new Date(),
        };

        const updates: any = {
          chatHistory: [...stage.chatHistory, newUserMessage, aiMessage],
        };

        if (result.data.updatedRubrics) {
          updates.evaluationRubrics = result.data.updatedRubrics;
        }

        if (result.data.questions) {
          updates.questions = result.data.questions;
        }

        updateStage({
          ...stage,
          ...updates,
        });

        if (result.data.needsClarification) {
          setNeedsClarification(true);
          setClarificationPrompt(result.data.clarificationQuestion);
        }

        // Briefly show suggestions after AI responds
        setTimeout(() => setShowSuggestions(true), 1000);
      }
    } catch (error) {
      console.error('Error:', error);
      
      const errorMessage: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: "I'm having trouble processing that. Could you rephrase your question or try a different request?",
        timestamp: new Date(),
      };

      updateStage({
        ...stage,
        chatHistory: [...stage.chatHistory, newUserMessage, errorMessage],
      });
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setUserMessage(suggestion);
    inputRef.current?.focus();
  };

  const handleProceedToQuestions = async () => {
    setIsLoading(true);
    setCurrentSubStep('questions');

    
    try {
      if(!stage?.questions || stage?.questions.length==0){
        const transitionMessage: ChatMessage = {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: `Great! Now let me generate interview questions based on these rubrics. I'll create questions that help you evaluate candidates effectively...`,
          timestamp: new Date(),
        };

        updateStage({
          ...stage,
          chatHistory: [...stage.chatHistory, transitionMessage],
        });

        const result = await aiAPI.generateQuestions({
          stageId: stage.id,
          designation: jobData.designation,
          rubrics: stage.evaluationRubrics,
          jobDescription: jobData.jobDescriptionPdf?.parsedText,
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
            chatHistory: [...stage.chatHistory, transitionMessage, aiMessage],
            questions: result.data.questions,
          });
        }
      }
     
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: "I've created interview questions for you. Feel free to ask me to modify any question or generate new ones!",
        timestamp: new Date(),
      };

      updateStage({
        ...stage,
        chatHistory: [...stage.chatHistory, transitionMessage, errorMessage],
        questions: getDefaultQuestionsForStage(stage.evaluationRubrics),
      });
    } finally {
      setIsLoading(false);
      setShowSuggestions(true);
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

  // Manual edit functions (kept for direct user edits)
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

  const removeQuestion = (questionId: string) => {
    if (!stage.questions) return;
    
    updateStage({
      ...stage,
      questions: stage.questions.filter((q) => q.id !== questionId),
    });
  };

  const startEditingQuestion = (question: any) => {
    setEditingQuestionId(question.id);
    setEditedQuestion({ ...question });
  };
  const cancelEditingRubric = () => {
    setEditingRubricId(null);
    setEditedRubric(null);
  };
  const cancelEditingQuestion = () => {
    setEditingQuestionId(null);
    setEditedQuestion(null);
  };
  const updateEditedQuestionField = (field: string, value: any) => {
    if (!editedQuestion) return;
    setEditedQuestion({
      ...editedQuestion,
      [field]: value,
    });
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

  const canProceed = stage.evaluationRubrics.length > 0;
  const canProceedToNext = stage.id === 'audio_interview' 
    ? (currentSubStep === 'questions' && stage.questions && stage.questions.length > 0)
    : canProceed;

  return (
    <div className="space-y-4">
      {/* Progress indicator for audio interview */}
      {stage.id === 'audio_interview' && (
        <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
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

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Rubrics/Questions Display - 1/3 width */}
        <div className="lg:col-span-1">
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

          {stage.id === 'audio_interview' && currentSubStep === 'questions' && (
            <div className="p-4 bg-gradient-to-br from-purple-50 to-slate-50 rounded-lg border border-purple-200 h-full">
              <h3 className="text-slate-900 font-semibold mb-3">Interview Questions</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
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
                  onDragOver={(e, hoverIndex) => setDragOverIndex(hoverIndex)}
                  onDrop={(dropIndex) => {
                        if (draggedQuestionIndex !== null) {
                          moveQuestion(draggedQuestionIndex, dropIndex);
                        }
                        setDraggedQuestionIndex(null);
                        setDragOverIndex(null);
                      }}
                />
              ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Chat Interface - 2/3 width */}
        <div className="lg:col-span-2">
          <div className="border border-slate-200 rounded-lg overflow-hidden shadow-lg bg-white">
            
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
            <div className="p-4 bg-white border-t border-slate-200">
              {needsClarification && clarificationPrompt && (
                <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-900">{clarificationPrompt}</p>
                </div>
              )}
              
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={userMessage}
                  onChange={(e) => setUserMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  placeholder={
                    currentSubStep === 'questions' 
                      ? "Ask me to modify questions, add new ones, or explain my suggestions..." 
                      : "Chat with me to customize rubrics - add, remove, or modify anything..."
                  }
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isLoading || !userMessage.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:from-blue-700 hover:to-blue-600 disabled:from-slate-300 disabled:to-slate-300 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              
              <p className="text-xs text-slate-500 mt-2 text-center">
                💡 Tip: Just chat naturally - I understand context and can help refine your hiring process
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <button
          onClick={currentSubStep === 'questions' && stage.id === 'audio_interview' ? () => setCurrentSubStep('rubrics') : onBack}
          className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
        >
          ← Back
        </button>
        <button
          onClick={
            stage.id === 'audio_interview' && currentSubStep === 'rubrics' 
              ? handleProceedToQuestions 
              : onNext
          }
          disabled={stage.id === 'audio_interview' ? (currentSubStep === 'rubrics' ? !canProceed : !canProceedToNext) : !canProceed}
          className={`px-6 py-3 rounded-lg transition-all font-medium shadow-md ${
            (stage.id === 'audio_interview' ? (currentSubStep === 'rubrics' ? canProceed : canProceedToNext) : canProceed)
              ? ' bg-blue-600 text-white hover:from-blue-700 hover:to-blue-600 hover:shadow-lg'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          {stage.id === 'audio_interview' && currentSubStep === 'rubrics'
            ? 'Generate Questions →'
            : isLastStage 
            ? 'Review & Finish →' 
            : 'Next Stage →'}
        </button>
      </div>
    </div>
  );
}

// Fallback functions (same as before but simplified)
function getDefaultRubricsForStage(stageId: string) {
  return [
    { id: `${stageId}-1`, name: 'Relevant Experience', description: 'Quality and relevance of past work', weight: 30 },
    { id: `${stageId}-2`, name: 'Skills Match', description: 'Alignment with job requirements', weight: 30 },
    { id: `${stageId}-3`, name: 'Problem Solving', description: 'Analytical and critical thinking', weight: 25 },
    { id: `${stageId}-4`, name: 'Cultural Fit', description: 'Team and company alignment', weight: 15 },
  ];
}

function getDefaultQuestionsForStage(rubrics: any[]) {
  return Array.from({ length: 10 }, (_, i) => ({
    id: `q-${Date.now()}-${i}`,
    question: `Tell me about a time when you demonstrated ${rubrics[i % rubrics.length]?.name.toLowerCase()}.`,
    rubricId: rubrics[i % rubrics.length]?.id || '',
  }));
}