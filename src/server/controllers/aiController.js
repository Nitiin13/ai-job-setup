import { GoogleGenerativeAI } from '@google/generative-ai';
import Job from '../models/Job.js';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'YOUR_GEMINI_API_KEY');

// System prompts for different contexts
const getSystemPrompt = (context) => {
  const basePrompt = `You are an expert HR consultant and talent acquisition specialist helping create a customized hiring process. You have deep expertise in:
- Designing evaluation frameworks for different interview stages
- Creating role-specific assessment criteria
- Generating behavioral and technical interview questions
- Understanding nuances between technical, sales, customer-facing, and leadership roles

Your communication style:
- Natural and conversational, not robotic
- Ask clarifying questions when needed
- Provide explanations for your suggestions
- Adapt to the user's communication style
- Be proactive in offering improvements`;

  const contextPrompts = {
    rubrics: `
CURRENT TASK: Help design evaluation rubrics for the ${context.stageName} stage.

CONTEXT:
- Position: ${context.designation}
- Interview Stage: ${context.stageId}
- Stage Purpose: ${context.stageContext}
${context.jobDescription ? `\nJob Description:\n${context.jobDescription}\n` : ''}
${context.currentRubrics.length > 0 ? `\nCurrent Rubrics:\n${JSON.stringify(context.currentRubrics, null, 2)}\n` : ''}

You should:
1. Understand what the user wants to change or add
2. Explain your reasoning for suggestions
3. Consider the specific stage requirements
4. Ensure rubrics are measurable and actionable

When returning rubrics, use this JSON structure:
{
  "message": "Your conversational response explaining the changes",
  "rubrics": [
    {
      "name": "Rubric Name",
      "description": "Clear description"
    }
  ],
  "needsClarification": false,
  "clarificationQuestion": null
}

If you need more information, set needsClarification to true and provide a clarificationQuestion.`,

    questions: `
CURRENT TASK: Help create or refine interview questions for the ${context.stageName} stage.

CONTEXT:
- Position: ${context.designation}
- Interview Stage: ${context.stageId}
- Evaluation Rubrics: ${JSON.stringify(context.rubrics, null, 2)}
${context.currentQuestions.length > 0 ? `\nCurrent Questions:\n${JSON.stringify(context.currentQuestions, null, 2)}\n` : ''}

You should:
1. Generate questions that map to the rubrics
2. Ensure questions are appropriate for audio/verbal format
3. Mix behavioral (STAR) and technical discussion questions
4. Make questions role-specific and insightful
5. Explain why certain questions are valuable

When returning questions, use this JSON structure:
{
  "message": "Your conversational response",
  "questions": [
    {
      "question": "Question text",
      "rubricId": "matching rubric name",
      "rationale": "Why this question is valuable (optional)"
    }
  ],
  "needsClarification": false,
  "clarificationQuestion": null
}`,

    analysis: `
CURRENT TASK: Analyze the job description and extract key insights.

You should provide a comprehensive analysis including:
- Required technical and soft skills
- Experience level needed
- Key responsibilities
- Must-have vs nice-to-have qualifications
- Potential challenges in the role

Return JSON structure:
{
  "message": "Your analysis summary",
  "analysis": {
    "technicalSkills": [],
    "softSkills": [],
    "experienceYears": number,
    "responsibilities": [],
    "mustHave": [],
    "niceToHave": [],
    "roleChallenges": []
  }
}`
  };

  return basePrompt + (contextPrompts[context.type] || '');
};

// Generate evaluation rubrics with conversation context
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

    const stageContext = getStageContext(stageId);
    const stageName = stageId.replace(/_/g, ' ');

    const systemPrompt = getSystemPrompt({
      type: 'rubrics',
      stageId,
      stageName,
      designation,
      stageContext,
      jobDescription: jobDescription?.substring(0, 1500),
      currentRubrics: existingRubrics,
    });

    const userPrompt = existingRubrics.length > 0
      ? "Please review and enhance the current rubrics to better evaluate candidates for this role and stage."
      : `Please create comprehensive evaluation rubrics for the ${stageName} stage for a ${designation} position.`;

    const chat = model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: systemPrompt }],
        },
        {
          role: 'model',
          parts: [{ text: 'I understand. I\'m ready to help you design effective evaluation rubrics. I\'ll be conversational and adaptive to your needs.' }],
        },
      ],
    });

    const result = await chat.sendMessage(userPrompt);
    const response = await result.response;
    const text = response.text();

    // Parse AI response
    let aiResponse = parseAIResponse(text);

    // Add IDs to rubrics
    if (aiResponse.rubrics) {
      aiResponse.rubrics = aiResponse.rubrics.map((rubric, index) => ({
        id: `${stageId}-${Date.now()}-${index}`,
        ...rubric,
      }));
    }

    res.json({
      success: true,
      data: {
        rubrics: aiResponse.rubrics || getDefaultRubricsForStage(stageId, designation),
        message: aiResponse.message || `I've prepared evaluation rubrics for ${stageName}.`,
        needsClarification: aiResponse.needsClarification || false,
        clarificationQuestion: aiResponse.clarificationQuestion || null,
      },
    });
  } catch (error) {
    console.error('Error generating rubrics:', error);
    handleError(res, req.body.stageId, req.body.designation, 'rubrics');
  }
};

// Enhanced conversational chat
export const chatWithAI = async (req, res) => {
  try {
    const { 
      message, 
      stageId, 
      designation, 
      currentRubrics = [], 
      currentQuestions = [],
      chatHistory = [],
      context = 'rubrics', // 'rubrics' or 'questions'
      jobDescription 
    } = req.body;

    if (!message || !stageId) {
      return res.status(400).json({
        success: false,
        message: 'Message and stage ID are required',
      });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const stageContext = getStageContext(stageId);
    const stageName = stageId.replace(/_/g, ' ');

    // Build system prompt based on context
    const systemPrompt = getSystemPrompt({
      type: context,
      stageId,
      stageName,
      designation,
      stageContext,
      jobDescription: jobDescription?.substring(0, 1500),
      currentRubrics,
      currentQuestions,
      rubrics: currentRubrics,
    });

    // Convert chat history to Gemini format
    const history = [
      {
        role: 'user',
        parts: [{ text: systemPrompt }],
      },
      {
        role: 'model',
        parts: [{ text: 'I understand the context. I\'m here to help you create the best hiring process. What would you like to discuss?' }],
      },
    ];

    // Add previous conversation history
    chatHistory.slice(-10).forEach((msg) => {
      history.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      });
    });

    const chat = model.startChat({ history });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    const text = response.text();

    // Parse AI response
    let aiResponse = parseAIResponse(text);

    // Add IDs to new rubrics if provided
    if (aiResponse.rubrics) {
      aiResponse.rubrics = aiResponse.rubrics.map((rubric, index) => ({
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
        rationale: q.rationale || null,
      }));
    }

    res.json({
      success: true,
      data: {
        message: aiResponse.message || text,
        updatedRubrics: aiResponse.rubrics || null,
        questions: aiResponse.questions || null,
        needsClarification: aiResponse.needsClarification || false,
        clarificationQuestion: aiResponse.clarificationQuestion || null,
        analysis: aiResponse.analysis || null,
      },
    });
  } catch (error) {
    console.error('Error chatting with AI:', error);
    res.status(500).json({
      success: false,
      message: 'I apologize, but I encountered an error processing your request. Could you please rephrase your question?',
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

    const stageContext = getStageContext(stageId);
    const stageName = stageId.replace(/_/g, ' ');

    const systemPrompt = getSystemPrompt({
      type: 'questions',
      stageId,
      stageName,
      designation,
      stageContext,
      rubrics,
      currentQuestions: [],
    });

    const userPrompt = `Please generate 10 insightful interview questions for the ${stageName} stage that will help us evaluate candidates against our rubrics. Make them conversational and appropriate for an audio interview format.

Job Context: ${jobDescription?.substring(0, 1000) || 'Standard ' + designation + ' position'}`;

    const chat = model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: systemPrompt }],
        },
        {
          role: 'model',
          parts: [{ text: 'I\'m ready to create thoughtful interview questions that align with your evaluation criteria.' }],
        },
      ],
    });

    const result = await chat.sendMessage(userPrompt);
    const response = await result.response;
    const text = response.text();

    // Parse AI response
    let aiResponse = parseAIResponse(text);

    // Add IDs and ensure format
    const questions = (aiResponse.questions || getDefaultQuestionsForStage(stageId, rubrics)).map((q, index) => ({
      id: `q-${Date.now()}-${index}`,
      question: typeof q === 'string' ? q : q.question,
      rubricId: q.rubricId || rubrics[index % rubrics.length]?.id || '',
      rationale: q.rationale || null,
    }));

    res.json({
      success: true,
      data: {
        questions,
        message: aiResponse.message || `I've generated 10 interview questions tailored to your evaluation rubrics.`,
      },
    });
  } catch (error) {
    console.error('Error generating questions:', error);
    handleError(res, req.body.stageId, req.body.designation, 'questions', req.body.rubrics);
  }
};

// Analyze job description with conversational approach
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

    const systemPrompt = getSystemPrompt({
      type: 'analysis',
    });

    const userPrompt = `Please analyze this job description for a ${designation} position and provide comprehensive insights:

${jobDescription}

Focus on extracting:
1. Technical skills required (be specific)
2. Soft skills needed
3. Expected years of experience
4. Key responsibilities
5. Must-have qualifications
6. Nice-to-have qualifications
7. Potential challenges in this role

Provide a conversational analysis that will help create better interview questions and rubrics.`;

    const chat = model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: systemPrompt }],
        },
        {
          role: 'model',
          parts: [{ text: 'I\'m ready to analyze the job description thoroughly.' }],
        },
      ],
    });

    const result = await chat.sendMessage(userPrompt);
    const response = await result.response;
    const text = response.text();

    // Parse AI response
    let aiResponse = parseAIResponse(text);

    res.json({
      success: true,
      data: aiResponse.analysis || {
        technicalSkills: [],
        softSkills: [],
        experienceYears: 0,
        responsibilities: [],
        mustHave: [],
        niceToHave: [],
        roleChallenges: [],
      },
      message: aiResponse.message || 'Analysis complete',
    });
  } catch (error) {
    console.error('Error analyzing job description:', error);
    res.status(500).json({
      success: false,
      message: 'Error analyzing job description',
    });
  }
};

// Helper: Parse AI response (handles both JSON and natural text)
function parseAIResponse(text) {
  try {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = text.match(/```json?\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }

    // Try to find JSON object in text
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      return JSON.parse(objectMatch[0]);
    }

    // If no JSON found, return as plain message
    return { message: text };
  } catch (parseError) {
    // Return as plain text if JSON parsing fails
    return { message: text };
  }
}

// Helper: Handle errors with fallback
function handleError(res, stageId, designation, type, rubrics = null) {
  if (type === 'rubrics') {
    const fallbackRubrics = getDefaultRubricsForStage(stageId, designation);
    res.json({
      success: true,
      data: {
        rubrics: fallbackRubrics,
        message: `I've prepared evaluation rubrics for this stage. Feel free to ask me to modify them to better fit your needs.`,
      },
    });
  } else if (type === 'questions') {
    const fallbackQuestions = getDefaultQuestionsForStage(stageId, rubrics);
    res.json({
      success: true,
      data: {
        questions: fallbackQuestions,
        message: `I've generated interview questions based on your rubrics.`,
      },
    });
  } else {
    res.status(500).json({
      success: false,
      message: 'An error occurred. Please try again.',
    });
  }
}

// Helper: Get stage context
function getStageContext(stageId) {
  const contexts = {
    resume_screening: 'Initial screening to filter candidates based on resume/CV before any interviews. This is a paper-based evaluation to shortlist candidates.',
    audio_interview: 'First verbal interaction with candidate via phone/video call (30-45 min). Focus on communication skills, cultural fit, and role-specific discussion.',
    assignment: 'Practical work assignment to evaluate real-world skills and problem-solving ability through a take-home task.',
    personal_interview: 'In-depth face-to-face/video interview (60-90 min) with potential team members to assess technical depth and team fit.',
    founders_round: 'Final interview with company founders/C-level executives focusing on vision alignment, leadership potential, and cultural impact.',
  };
  return contexts[stageId] || 'Evaluation stage in the hiring process';
}

// Helper: Default rubrics (fallback only)
function getDefaultRubricsForStage(stageId, designation) {
  const defaultRubrics = {
    resume_screening: [
      { id: `${stageId}-${Date.now()}-1`, name: 'Relevant Experience', description: 'Years and quality of relevant work experience', weight: 30 },
      { id: `${stageId}-${Date.now()}-2`, name: 'Skills Match', description: 'Alignment of skills with job requirements', weight: 30 },
      { id: `${stageId}-${Date.now()}-3`, name: 'Achievements', description: 'Quantifiable accomplishments and impact', weight: 25 },
      { id: `${stageId}-${Date.now()}-4`, name: 'Education', description: 'Academic background and certifications', weight: 15 },
    ],
    audio_interview: [
      { id: `${stageId}-${Date.now()}-1`, name: 'Communication', description: 'Clarity and effectiveness of verbal communication', weight: 25 },
      { id: `${stageId}-${Date.now()}-2`, name: 'Technical Knowledge', description: 'Understanding of role-relevant concepts', weight: 30 },
      { id: `${stageId}-${Date.now()}-3`, name: 'Problem Solving', description: 'Approach to tackling challenges', weight: 25 },
      { id: `${stageId}-${Date.now()}-4`, name: 'Cultural Fit', description: 'Alignment with company values', weight: 20 },
    ],
  };

  return defaultRubrics[stageId] || [];
}

// Helper: Default questions (fallback only)
function getDefaultQuestionsForStage(stageId, rubrics) {
  if (!rubrics || rubrics.length === 0) {
    rubrics = getDefaultRubricsForStage(stageId, '');
  }

  return [
    { id: `q-${Date.now()}-1`, question: 'Tell me about a recent project you\'re proud of.', rubricId: rubrics[0]?.id },
    { id: `q-${Date.now()}-2`, question: 'How do you approach learning new technologies?', rubricId: rubrics[1]?.id },
    { id: `q-${Date.now()}-3`, question: 'Describe a challenging problem you solved recently.', rubricId: rubrics[2]?.id },
    { id: `q-${Date.now()}-4`, question: 'What interests you about this role?', rubricId: rubrics[3]?.id },
    { id: `q-${Date.now()}-5`, question: 'How do you handle tight deadlines?', rubricId: rubrics[0]?.id },
    { id: `q-${Date.now()}-6`, question: 'Tell me about a time you worked in a team.', rubricId: rubrics[3]?.id },
    { id: `q-${Date.now()}-7`, question: 'What\'s your approach to debugging issues?', rubricId: rubrics[2]?.id },
    { id: `q-${Date.now()}-8`, question: 'Where do you see yourself in 3 years?', rubricId: rubrics[3]?.id },
    { id: `q-${Date.now()}-9`, question: 'How do you stay current with industry trends?', rubricId: rubrics[1]?.id },
    { id: `q-${Date.now()}-10`, question: 'Describe your ideal work environment.', rubricId: rubrics[3]?.id },
  ];
}