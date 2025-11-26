import { GoogleGenerativeAI } from '@google/generative-ai';
import Job from '../models/Job.js';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'YOUR_GEMINI_API_KEY');

// Generate evaluation rubrics for a stage
export const generateRubrics = async (req, res) => {
  try {
    const { stageId, designation, jobDescription, existingRubrics = [] } = req.body;

    if (!stageId || !designation) {
      return res.status(400).json({
        success: false,
        message: 'Stage ID and designation are required',
      });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `You are an expert HR consultant. Generate 4-5 detailed evaluation rubrics for the "${stageId.replace(/_/g, ' ')}" stage of hiring for a "${designation}" position.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse the JSON response
    let rubrics;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = text.match(/```json?\n?([\s\S]*?)\n?```/) || text.match(/\[[\s\S]*\]/);
      const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;
      rubrics = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      // Return default rubrics if parsing fails
      rubrics = getDefaultRubricsForStage(stageId, designation);
    }

    // Add IDs to rubrics
    const rubricsWithIds = rubrics.map((rubric, index) => ({
      id: `${stageId}-${Date.now()}-${index}`,
      ...rubric,
    }));

    res.json({
      success: true,
      data: {
        rubrics: rubricsWithIds,
        message: `I've analyzed the job description for "${designation}" and suggest the following evaluation rubrics for ${stageId.replace(/_/g, ' ')}. You can ask me to modify these rubrics, add new ones, or remove any that don't fit your needs.`,
      },
    });
  } catch (error) {
    console.error('Error generating rubrics:', error);
    
    // Fallback to default rubrics
    const rubrics = getDefaultRubricsForStage(req.body.stageId, req.body.designation);
    
    res.json({
      success: true,
      data: {
        rubrics,
        message: `I've analyzed the job description for "${req.body.designation}" and suggest the following evaluation rubrics. You can ask me to modify these rubrics, add new ones, or remove any that don't fit your needs.`,
      },
    });
  }
};

// Chat with AI to modify rubrics
export const chatWithAI = async (req, res) => {
  try {
    const { message, stageId, designation, currentRubrics, chatHistory = [] } = req.body;

    if (!message || !stageId) {
      return res.status(400).json({
        success: false,
        message: 'Message and stage ID are required',
      });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Build conversation context
    const conversationContext = chatHistory
      .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n');

    const prompt = `You are an expert HR consultant helping to customize evaluation rubrics for the "${stageId.replace(/_/g, ' ')}" stage of hiring for a "${designation}" position.

Current rubrics:
${JSON.stringify(currentRubrics, null, 2)}

Previous conversation:
${conversationContext}

User request: ${message}

Based on the user's request, provide:
1. A conversational response explaining what changes you're making
2. Updated rubrics array (if applicable)
3. If the user asks to generate interview questions, provide 10 relevant questions

Format your response as JSON with these fields:
{
  "message": "your conversational response",
  "updatedRubrics": [...] or null,
  "questions": [...] or null
}

Only return the JSON object, no additional text.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse the JSON response
    let aiResponse;
    try {
      const jsonMatch = text.match(/```json?\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/);
      const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;
      aiResponse = JSON.parse(jsonText);
    } catch (parseError) {
      // Fallback to simple text response
      aiResponse = {
        message: text || "I understand you'd like to make changes. Could you please provide more specific details?",
        updatedRubrics: null,
        questions: null,
      };
    }

    // Add IDs to new rubrics if provided
    if (aiResponse.updatedRubrics) {
      aiResponse.updatedRubrics = aiResponse.updatedRubrics.map((rubric, index) => ({
        id: rubric.id || `${stageId}-${Date.now()}-${index}`,
        ...rubric,
      }));
    }

    // Add IDs to questions if provided
    if (aiResponse.questions) {
      aiResponse.questions = aiResponse.questions.map((q, index) => ({
        id: `q-${Date.now()}-${index}`,
        question: typeof q === 'string' ? q : q.question,
        rubricId: q.rubricId || currentRubrics[0]?.id || '',
      }));
    }

    res.json({
      success: true,
      data: aiResponse,
    });
  } catch (error) {
    console.error('Error chatting with AI:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error communicating with AI',
    });
  }
};

// Generate interview questions
export const generateQuestions = async (req, res) => {
  try {
    const { stageId, designation, rubrics, jobDescription } = req.body;

    if (!stageId || !rubrics || rubrics.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Stage ID and rubrics are required',
      });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `You are an expert HR consultant. Generate 10 interview questions for the "${stageId.replace(/_/g, ' ')}" stage of hiring for a "${designation}" position.

Job Description: ${jobDescription || 'Not provided'}

Evaluation Rubrics:
${rubrics.map((r, i) => `${i + 1}. ${r.name}: ${r.description}`).join('\n')}

Generate 10 thoughtful interview questions that map to these rubrics. Each question should help evaluate one or more of the rubrics.

Format your response as a JSON array with objects containing: question, rubricId (use the rubric name).
Only return the JSON array, no additional text.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse the JSON response
    let questions;
    try {
      const jsonMatch = text.match(/```json?\n?([\s\S]*?)\n?```/) || text.match(/\[[\s\S]*\]/);
      const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;
      questions = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('Error parsing questions:', parseError);
      // Return default questions
      questions = getDefaultQuestionsForStage(stageId, rubrics);
    }

    // Add IDs and ensure rubricId exists
    const questionsWithIds = questions.map((q, index) => ({
      id: `q-${Date.now()}-${index}`,
      question: typeof q === 'string' ? q : q.question,
      rubricId: q.rubricId || rubrics[index % rubrics.length]?.id || '',
    }));

    res.json({
      success: true,
      data: {
        questions: questionsWithIds,
        message: `I've generated 10 interview questions based on your evaluation rubrics. These questions are designed to assess ${rubrics.map(r => r.name.toLowerCase()).join(', ')}.`,
      },
    });
  } catch (error) {
    console.error('Error generating questions:', error);
    
    // Fallback to default questions
    const questions = getDefaultQuestionsForStage(req.body.stageId, req.body.rubrics);
    
    res.json({
      success: true,
      data: {
        questions,
        message: `I've generated 10 interview questions based on your evaluation rubrics.`,
      },
    });
  }
};

// Analyze job description
export const analyzeJobDescription = async (req, res) => {
  try {
    const { jobDescription, designation } = req.body;

    if (!jobDescription) {
      return res.status(400).json({
        success: false,
        message: 'Job description is required',
      });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `Analyze this job description for a "${designation}" position and extract key insights:

${jobDescription}

Provide:
1. Key technical skills required
2. Years of experience needed
3. Key responsibilities
4. Must-have qualifications
5. Nice-to-have qualifications

Format as JSON with these fields: technicalSkills (array), experienceYears (number), responsibilities (array), mustHave (array), niceToHave (array).
Only return the JSON object, no additional text.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse the JSON response
    let analysis;
    try {
      const jsonMatch = text.match(/```json?\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/);
      const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;
      analysis = JSON.parse(jsonText);
    } catch (parseError) {
      analysis = {
        technicalSkills: ['Skills analysis in progress'],
        experienceYears: 0,
        responsibilities: ['Responsibilities analysis in progress'],
        mustHave: ['Qualifications analysis in progress'],
        niceToHave: ['Additional qualifications analysis in progress'],
      };
    }

    res.json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    console.error('Error analyzing job description:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error analyzing job description',
    });
  }
};

// Helper function to get default rubrics
function getDefaultRubricsForStage(stageId, designation) {
  const defaultRubrics = {
    resume_screening: [
      {
        id: `${stageId}-${Date.now()}-1`,
        name: 'Quantifiable Achievements',
        description: 'Measurable results and impact in previous roles with specific metrics and numbers',
        weight: 25,
      },
      {
        id: `${stageId}-${Date.now()}-2`,
        name: 'Technical Skills Match',
        description: 'Alignment of technical competencies with job requirements',
        weight: 30,
      },
      {
        id: `${stageId}-${Date.now()}-3`,
        name: 'Experience Relevance',
        description: 'Years of relevant experience and progression in similar roles',
        weight: 25,
      },
      {
        id: `${stageId}-${Date.now()}-4`,
        name: 'Education & Certifications',
        description: 'Academic qualifications and professional certifications',
        weight: 20,
      },
    ],
    audio_interview: [
      {
        id: `${stageId}-${Date.now()}-1`,
        name: 'Communication Skills',
        description: 'Clarity, articulation, and professional communication',
        weight: 20,
      },
      {
        id: `${stageId}-${Date.now()}-2`,
        name: 'Technical Depth',
        description: 'Deep understanding of technical concepts and problem-solving approach',
        weight: 30,
      },
      {
        id: `${stageId}-${Date.now()}-3`,
        name: 'Cultural Fit',
        description: 'Alignment with company values and team dynamics',
        weight: 25,
      },
      {
        id: `${stageId}-${Date.now()}-4`,
        name: 'Motivation & Interest',
        description: 'Genuine interest in the role and long-term career goals',
        weight: 25,
      },
    ],
  };

  return defaultRubrics[stageId] || [];
}

// Helper function to get default questions
function getDefaultQuestionsForStage(stageId, rubrics) {
  return [
    { id: `q-${Date.now()}-1`, question: 'Can you describe a recent project where you demonstrated strong technical skills?', rubricId: rubrics[0]?.id },
    { id: `q-${Date.now()}-2`, question: 'How do you approach communicating complex technical concepts to non-technical stakeholders?', rubricId: rubrics[0]?.id },
    { id: `q-${Date.now()}-3`, question: 'What motivates you about this role and our company?', rubricId: rubrics[1]?.id },
    { id: `q-${Date.now()}-4`, question: 'Describe a time when you had to adapt to a significant change in your work environment.', rubricId: rubrics[2]?.id },
    { id: `q-${Date.now()}-5`, question: 'How do you stay updated with the latest technologies in your field?', rubricId: rubrics[0]?.id },
    { id: `q-${Date.now()}-6`, question: 'Tell me about a challenging problem you solved recently and your approach.', rubricId: rubrics[1]?.id },
    { id: `q-${Date.now()}-7`, question: 'How do you handle disagreements with team members?', rubricId: rubrics[2]?.id },
    { id: `q-${Date.now()}-8`, question: 'What are your long-term career goals?', rubricId: rubrics[3]?.id },
    { id: `q-${Date.now()}-9`, question: 'Describe your ideal work environment and team culture.', rubricId: rubrics[2]?.id },
    { id: `q-${Date.now()}-10`, question: 'How do you prioritize tasks when working on multiple projects?', rubricId: rubrics[0]?.id },
  ];
}