export interface EvaluationRubric {
  id: string;
  name: string;
  description: string;
  weight?: number;
}

export interface InterviewQuestion {
  id: string;
  question: string;
  rubricId: string;
  expectedAnswer?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface StageConfig {
  id: string;
  name: string;
  enabled: boolean;
  locked: boolean;
  evaluationRubrics: EvaluationRubric[];
  questions?: InterviewQuestion[];
  chatHistory: ChatMessage[];
}

export interface JobSetupData {
  designation: string;
  jobDescriptionPdf: {
    fileName: string;
    s3Url: string;
    parsedText: string;
  } | null;
  stages: {
    resume_screening: StageConfig;
    audio_interview: StageConfig;
    assignment: StageConfig;
    personal_interview: StageConfig;
    founders_round: StageConfig;
    rejected: StageConfig;
  };
}
