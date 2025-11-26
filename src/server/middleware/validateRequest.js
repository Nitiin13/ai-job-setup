// Request validation middleware
export const validateJobCreation = (req, res, next) => {
  const { designation, jobDescriptionPdf } = req.body;

  if (!designation || !designation.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Designation is required',
    });
  }

  if (!jobDescriptionPdf || !jobDescriptionPdf.fileName || !jobDescriptionPdf.s3Url) {
    return res.status(400).json({
      success: false,
      message: 'Valid job description PDF is required',
    });
  }

  next();
};

// Validate stage configuration
export const validateStageConfig = (req, res, next) => {
  const { stageId } = req.params;
  const validStages = [
    'resume_screening',
    'audio_interview',
    'assignment',
    'personal_interview',
    'founders_round',
    'rejected',
  ];

  if (!validStages.includes(stageId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid stage ID',
    });
  }

  next();
};

// Validate AI request
export const validateAIRequest = (req, res, next) => {
  const { stageId, designation } = req.body;

  if (!stageId) {
    return res.status(400).json({
      success: false,
      message: 'Stage ID is required',
    });
  }

  if (!designation) {
    return res.status(400).json({
      success: false,
      message: 'Designation is required',
    });
  }

  next();
};
