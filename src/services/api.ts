const API_BASE_URL = import.meta?.env?.VITE_API_URL ||'https://ai-job-setup.vercel.app/api';

// Generic fetch wrapper
async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'API request failed');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// Job API
export const jobAPI = {
  // Create a new job
  createJob: async (jobData: any) => {
    return fetchAPI('/jobs', {
      method: 'POST',
      body: JSON.stringify(jobData),
    });
  },

  // Get all jobs
  getJobs: async (params?: { status?: string; designation?: string; page?: number; limit?: number }) => {
    const queryString = new URLSearchParams(params as any).toString();
    return fetchAPI(`/jobs?${queryString}`);
  },

  // Get job by ID
  getJobById: async (id: string) => {
    return fetchAPI(`/jobs/${id}`);
  },

  // Update job
  updateJob: async (id: string, updates: any) => {
    return fetchAPI(`/jobs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  // Delete job
  deleteJob: async (id: string) => {
    return fetchAPI(`/jobs/${id}`, {
      method: 'DELETE',
    });
  },

  // Upload PDF
  uploadPdf: async (file: File) => {
    const formData = new FormData();
    formData.append('pdf', file);

    const response = await fetch(`${API_BASE_URL}/jobs/upload-pdf`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'PDF upload failed');
    }

    return data;
  },

  // Update stage configuration
  updateStageConfig: async (jobId: string, stageId: string, stageData: any) => {
    return fetchAPI(`/jobs/${jobId}/stages/${stageId}`, {
      method: 'PUT',
      body: JSON.stringify(stageData),
    });
  },
};

// AI API
export const aiAPI = {
  // Generate evaluation rubrics
  generateRubrics: async (params: {
    stageId: string;
    designation: string;
    jobDescription?: string;
    existingRubrics?: any[];
  }) => {
    return fetchAPI('/ai/generate-rubrics', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  // Chat with AI
  chatWithAI: async (params: {
    message: string;
    stageId: string;
    designation: string;
    currentRubrics: any[];
    chatHistory?: any[];
  }) => {
    return fetchAPI('/ai/chat', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  // Generate interview questions
  generateQuestions: async (params: {
    stageId: string;
    designation: string;
    rubrics: any[];
    jobDescription?: string;
  }) => {
    return fetchAPI('/ai/generate-questions', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  // Analyze job description
  analyzeJobDescription: async (params: {
    designation: string;
    jobDescription: string;
  }) => {
    return fetchAPI('/ai/analyze-job-description', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },
};