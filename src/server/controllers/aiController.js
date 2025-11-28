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

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    // Enhanced prompt with more context and structure
    const stageContext = getStageContext(stageId);
    
    const prompt = `You are an expert HR consultant and talent acquisition specialist with 15+ years of experience in technical hiring.

CONTEXT:
- Position: ${designation}
- Interview Stage: ${stageId.replace(/_/g, ' ')}
- Stage Purpose: ${stageContext}
${jobDescription ? `\nJob Description:\n${jobDescription.substring(0, 1500)}\n` : ''}

TASK:
Generate exactly 4-5 evaluation rubrics specifically tailored for the ${stageId.replace(/_/g, ' ')} stage.

REQUIREMENTS FOR ${stageId.toUpperCase()}:
${getStageRequirements(stageId, designation)}

FORMAT:
Return ONLY a valid JSON array with this exact structure:
[
  {
    "name": "Rubric Name (3-5 words)",
    "description": "Clear, specific description of what this rubric evaluates (15-25 words)",
    "weight": number (percentage, all weights must sum to 100)
  }
]

GUIDELINES:
1. Each rubric must be SPECIFIC to ${stageId.replace(/_/g, ' ')} - don't use generic rubrics
2. For ${designation}, focus on role-relevant competencies
3. Rubric names should be concise and professional
4. Descriptions must be actionable and measurable
5. Weights should reflect importance (higher weight = more critical)
6. All weights must sum to exactly 100

EXAMPLE for audio_interview of "Senior Software Engineer":
[
  {
    "name": "Technical Problem Solving",
    "description": "Ability to break down complex technical problems and articulate solution approaches clearly",
    "weight": 30
  },
  {
    "name": "Communication Clarity",
    "description": "Clear articulation of technical concepts with appropriate terminology and examples",
    "weight": 25
  }
]

Return ONLY the JSON array, no markdown, no explanation, no additional text.`;

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

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    // Build conversation context
    const conversationContext = chatHistory
      .slice(-6) // Only last 6 messages for context
      .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n');

    const stageContext = getStageContext(stageId);
    const stageRequirements = getStageRequirements(stageId, designation);

    const prompt = `You are an expert HR consultant and technical interviewer helping customize evaluation rubrics for the "${stageId.replace(/_/g, ' ')}" stage.

CONTEXT:
- Position: ${designation}
- Interview Stage: ${stageId.replace(/_/g, ' ')}
- Stage Purpose: ${stageContext}

STAGE-SPECIFIC REQUIREMENTS:
${stageRequirements}

CURRENT RUBRICS:
${JSON.stringify(currentRubrics, null, 2)}

CONVERSATION HISTORY:
${conversationContext}

USER REQUEST:
${message}

TASK:
Respond to the user's request while maintaining stage-appropriate rubrics.

CRITICAL RULES:
1. For ${stageId.replace(/_/g, ' ')}, rubrics must align with stage requirements above
2. If user asks to add/modify rubrics, ensure they fit the stage context
3. If user asks for questions (audio_interview only), generate 10 AUDIO-appropriate questions
4. Maintain professional, conversational tone
5. If request doesn't fit the stage, politely explain and suggest alternatives

RESPONSE FORMAT:
Return ONLY a valid JSON object with this structure:
{
  "message": "Conversational response explaining changes (2-3 sentences)",
  "updatedRubrics": [...] or null,
  "questions": [...] or null
}

For updatedRubrics, use format:
[
  {
    "name": "Rubric Name",
    "description": "Clear description",
    "weight": number
  }
]

For questions (audio_interview ONLY), use format:
[
  {
    "question": "Question text suitable for verbal conversation",
    "rubricId": "matching rubric name"
  }
]

Return ONLY the JSON object, no markdown, no additional text.`;

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

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    // Enhanced prompt for audio interview questions
    const prompt = `You are an expert technical interviewer with deep experience in conducting ${stageId.replace(/_/g, ' ')} for ${designation} positions.

CONTEXT:
- Position: ${designation}
- Interview Stage: ${stageId.replace(/_/g, ' ')}
- Interview Format: Audio/Phone conversation (30-45 minutes)
${jobDescription ? `\nJob Description Summary:\n${jobDescription.substring(0, 1000)}\n` : ''}

EVALUATION RUBRICS (These are what we're assessing):
${rubrics.map((r, i) => `${i + 1}. ${r.name} (${r.weight}%): ${r.description}`).join('\n')}

TASK:
Generate exactly 10 interview questions specifically designed for an AUDIO interview for ${designation}.

CRITICAL REQUIREMENTS FOR AUDIO INTERVIEW QUESTIONS:
1. Questions must be answerable VERBALLY (no coding, no whiteboard, no screen sharing)
2. Focus on past experiences, problem-solving approaches, and technical thinking
3. Use "Tell me about...", "Describe a time when...", "How would you..." formats
4. Each question should take 3-5 minutes to answer thoroughly
5. Questions should reveal depth of knowledge through conversation
6. Mix behavioral (STAR format) and technical discussion questions
7. Questions must map directly to the rubrics above

AVOID:
- Questions requiring code writing
- Questions needing diagrams or visual aids
- Yes/No questions
- Questions too broad or too narrow
- Generic questions that don't relate to ${designation}

DISTRIBUTION:
- Ensure questions cover ALL rubrics proportionally to their weights
- Higher weight rubrics should have more questions

FORMAT:
Return ONLY a valid JSON array with this exact structure:
[
  {
    "question": "Full question text that is clear and specific for audio conversation",
    "rubricId": "${rubrics[0]?.name || 'rubric-name'}"
  }
]

EXAMPLE for "Senior Software Engineer" audio interview:
[
  {
    "question": "Tell me about a time when you had to optimize a critical piece of code that was causing performance issues. Walk me through your approach to identifying the bottleneck and how you resolved it.",
    "rubricId": "Technical Problem Solving"
  },
  {
    "question": "Describe your experience with system design. Can you walk me through how you would architect a URL shortening service like bit.ly, explaining your technical decisions?",
    "rubricId": "Technical Depth"
  }
]

Generate 10 questions NOW. Return ONLY the JSON array, no markdown, no explanation.`;


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

// Helper function to get stage context
function getStageContext(stageId) {
  const contexts = {
    resume_screening: 'Initial screening to filter candidates based on resume/CV before any interviews. This is a paper-based evaluation to shortlist candidates.',
    audio_interview: 'First verbal interaction with candidate via phone/video call (30-45 min). Focus on communication skills, role-specific scenarios, and cultural fit. For customer-facing roles: assess empathy, problem-solving, and service orientation. For sales roles: evaluate persuasion skills, objection handling, and relationship building.',
    assignment: 'Practical assignment to evaluate role-specific skills. For customer-facing roles: simulate customer interactions, complaint resolution, or support scenarios. For sales roles: create pitch decks, handle mock sales calls, or develop account strategies.',
    personal_interview: 'In-depth face-to-face/video interview (60-90 min) with potential team members. For customer-facing roles: deep dive into customer service philosophy, conflict resolution examples, and stakeholder management. For sales roles: explore sales methodology, negotiation experience, pipeline management, and client relationship success stories.',
    founders_round: 'Final interview with company founders/C-level executives. Focus on vision alignment, growth mindset, and cultural impact. For customer-facing roles: assess brand ambassadorship and customer advocacy potential. For sales roles: evaluate revenue generation thinking, market understanding, and strategic account development capabilities.',
  };
  return contexts[stageId] || 'Evaluation stage in the hiring process';
}

// Helper function to get stage-specific requirements
function getStageRequirements(stageId, designation) {
  const requirements = {
    resume_screening: `- Focus on resume/CV screening criteria ONLY
- Evaluate quantifiable achievements, not potential
- Check relevant skills match against job requirements (communication, sales metrics, customer service experience)
- Assess experience relevance and career progression in customer-facing or sales roles
- Consider education, certifications, and industry-specific training
- NO interview-based criteria (personality, presence, etc.)`,
    
    audio_interview: `- This is a PHONE/VIDEO conversation focused on communication and role fit
- Evaluate verbal communication, tone, and active listening skills
- Assess customer empathy and relationship-building ability through discussion
- For sales roles: discuss sales approach, objection handling, and closing techniques
- For customer-facing roles: explore service philosophy and conflict resolution strategies
- Gauge cultural fit, motivation, and alignment with company values
- Questions should elicit real-world examples and scenario responses (3-5 minutes each)
- NO written assignments, NO presentations during this call`,
    
    assignment: `- Evaluate actual work product submitted by candidate
- For sales roles: review pitch decks, sales plans, or mock client proposals for clarity and persuasiveness
- For customer-facing roles: assess support scenario responses, email communication quality, or process documentation
- Check problem-solving approach through realistic simulations
- Evaluate professionalism, attention to detail, and customer-centric thinking
- For ${designation}, check role-specific competencies and practical skills
- Review organization, completeness, and follow-through`,
    
    personal_interview: `- Deep dive into past customer/client experiences and success stories
- For sales roles: explore deal cycles, negotiation wins, pipeline management, and quota achievement
- For customer-facing roles: discuss customer retention strategies, escalation handling, and service excellence
- Assess collaboration with cross-functional teams (product, support, marketing)
- Check adaptability, resilience, and learning from failures
- For ${designation}, verify hands-on experience and situational expertise
- Can include role-play scenarios or case study discussions`,
    
    founders_round: `- Evaluate strategic thinking and business acumen
- Assess alignment with company vision, mission, and culture
- For sales roles: check revenue growth mindset, market understanding, and account expansion thinking
- For customer-facing roles: verify customer advocacy potential and brand ambassadorship
- Check leadership potential and ability to influence company culture
- For ${designation}, verify how they can drive customer satisfaction and business impact
- Understand career motivations, long-term aspirations, and commitment to growth`,
  };
  
  return requirements[stageId] || 'Standard evaluation criteria for this stage';
}
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
        name: 'Technical Discussion Ability',
        description: 'Ability to explain technical concepts, architectures, and past work clearly through verbal conversation without code',
        weight: 30,
      },
      {
        id: `${stageId}-${Date.now()}-2`,
        name: 'Communication & Articulation',
        description: 'Clear verbal expression of ideas, active listening, asking clarifying questions, and professional phone/video presence',
        weight: 25,
      },
      {
        id: `${stageId}-${Date.now()}-3`,
        name: 'Problem-Solving Approach',
        description: 'Structured thinking process when discussing technical challenges, ability to explain trade-offs and decision-making rationale',
        weight: 25,
      },
      {
        id: `${stageId}-${Date.now()}-4`,
        name: 'Role Alignment & Motivation',
        description: 'Understanding of role requirements, genuine interest in the position, and alignment with career goals',
        weight: 20,
      },
    ],
  };

  return defaultRubrics[stageId] || [];
}

// Helper function to get default questions (audio interview specific)
function getDefaultQuestionsForStage(stageId, rubrics) {
  if (stageId === 'audio_interview') {
    return [
      { 
        id: `q-${Date.now()}-1`, 
        question: 'Tell me about a complex technical project you worked on recently. Walk me through the architecture and your specific contributions to the solution.',
        rubricId: rubrics[0]?.id 
      },
      { 
        id: `q-${Date.now()}-2`, 
        question: 'Describe a time when you had to explain a technical concept or design decision to non-technical stakeholders. How did you approach it and what was the outcome?',
        rubricId: rubrics[1]?.id 
      },
      { 
        id: `q-${Date.now()}-3`, 
        question: 'Can you walk me through your problem-solving approach when you encounter a challenging technical issue? Give me a specific example from your recent work.',
        rubricId: rubrics[2]?.id 
      },
      { 
        id: `q-${Date.now()}-4`, 
        question: 'Tell me about a technical decision you made that you later realized wasn\'t optimal. How did you identify the issue and what did you learn from it?',
        rubricId: rubrics[2]?.id 
      },
      { 
        id: `q-${Date.now()}-5`, 
        question: 'Describe your experience with system design. If you were to design a scalable notification service, what would be your high-level approach and key considerations?',
        rubricId: rubrics[0]?.id 
      },
      { 
        id: `q-${Date.now()}-6`, 
        question: 'What interests you most about this position, and how does it align with your career goals and technical growth aspirations?',
        rubricId: rubrics[3]?.id 
      },
      { 
        id: `q-${Date.now()}-7`, 
        question: 'Tell me about a time when you had to quickly learn a new technology or framework for a project. How did you approach the learning process?',
        rubricId: rubrics[0]?.id 
      },
      { 
        id: `q-${Date.now()}-8`, 
        question: 'Describe a situation where you had to debug a critical production issue. Walk me through your debugging process and how you identified the root cause.',
        rubricId: rubrics[2]?.id 
      },
      { 
        id: `q-${Date.now()}-9`, 
        question: 'How do you stay current with technology trends and best practices in your field? Can you give me an example of something you\'ve recently learned and applied?',
        rubricId: rubrics[0]?.id 
      },
      { 
        id: `q-${Date.now()}-10`, 
        question: 'Tell me about a time when you had to make a trade-off between code quality and meeting a deadline. How did you approach this decision and what was the outcome?',
        rubricId: rubrics[2]?.id 
      },
    ];
  }
  
  // Generic fallback for other stages
  return [
    { id: `q-${Date.now()}-1`, question: 'Can you describe a recent project where you demonstrated strong skills relevant to this role?', rubricId: rubrics[0]?.id },
    { id: `q-${Date.now()}-2`, question: 'How do you approach communicating complex ideas to different audiences?', rubricId: rubrics[1]?.id },
    { id: `q-${Date.now()}-3`, question: 'What motivates you about this role and our company?', rubricId: rubrics[2]?.id },
    { id: `q-${Date.now()}-4`, question: 'Describe a time when you had to adapt to a significant change in your work environment.', rubricId: rubrics[3]?.id },
    { id: `q-${Date.now()}-5`, question: 'How do you stay updated with developments in your field?', rubricId: rubrics[0]?.id },
    { id: `q-${Date.now()}-6`, question: 'Tell me about a challenging problem you solved recently and your approach.', rubricId: rubrics[1]?.id },
    { id: `q-${Date.now()}-7`, question: 'How do you handle disagreements with team members?', rubricId: rubrics[2]?.id },
    { id: `q-${Date.now()}-8`, question: 'What are your long-term career goals?', rubricId: rubrics[3]?.id },
    { id: `q-${Date.now()}-9`, question: 'Describe your ideal work environment and team culture.', rubricId: rubrics[2]?.id },
    { id: `q-${Date.now()}-10`, question: 'How do you prioritize tasks when working on multiple projects?', rubricId: rubrics[0]?.id },
  ];
}