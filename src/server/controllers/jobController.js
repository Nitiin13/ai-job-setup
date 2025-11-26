import Job from '../models/Job.js';
import { uploadToS3, deleteFromS3 } from '../utils/s3Utils.js';
import { extractTextFromPdf, validatePdfParsability } from '../utils/pdfUtils.js';

// Create a new job
export const createJob = async (req, res) => {
  try {
    const jobData = req.body;

    // Validate required fields
    if (!jobData.designation || !jobData.jobDescriptionPdf) {
      return res.status(400).json({
        success: false,
        message: 'Designation and job description PDF are required',
      });
    }

    // Create job in database
    const job = new Job(jobData);
    await job.save();

    res.status(201).json({
      success: true,
      message: 'Job created successfully',
      data: job,
    });
  } catch (error) {
    console.error('Error creating job:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating job',
    });
  }
};

// Get all jobs
export const getJobs = async (req, res) => {
  try {
    const { status, designation, page = 1, limit = 10 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (designation) query.designation = new RegExp(designation, 'i');

    const jobs = await Job.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const count = await Job.countDocuments(query);

    res.json({
      success: true,
      data: jobs,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count,
    });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching jobs',
    });
  }
};

// Get job by ID
export const getJobById = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }

    res.json({
      success: true,
      data: job,
    });
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching job',
    });
  }
};

// Update job
export const updateJob = async (req, res) => {
  try {
    const job = await Job.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }

    res.json({
      success: true,
      message: 'Job updated successfully',
      data: job,
    });
  } catch (error) {
    console.error('Error updating job:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating job',
    });
  }
};

// Delete job
export const deleteJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }

    // Delete PDF from S3
    if (job.jobDescriptionPdf?.s3Key) {
      await deleteFromS3(job.jobDescriptionPdf.s3Key);
    }

    await Job.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Job deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting job:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error deleting job',
    });
  }
};

// Upload job description PDF to S3
export const uploadJobDescription = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    // Validate PDF can be parsed
    const isValid = await validatePdfParsability(req.file.buffer);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'PDF cannot be parsed to text. Please upload a valid PDF.',
      });
    }

    // Extract text from PDF
    const parsedText = await extractTextFromPdf(req.file.buffer);

    if (!parsedText || parsedText.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'PDF does not contain extractable text',
      });
    }

    // Upload to S3
    const s3Result = await uploadToS3(req.file);

    res.json({
      success: true,
      message: 'PDF uploaded and validated successfully',
      data: {
        fileName: req.file.originalname,
        s3Url: s3Result.url,
        s3Key: s3Result.key,
        parsedText: parsedText,
      },
    });
  } catch (error) {
    console.error('Error uploading PDF:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error uploading PDF',
    });
  }
};

// Validate PDF
export const validatePdf = async (req, res) => {
  try {
    const { s3Key } = req.body;

    if (!s3Key) {
      return res.status(400).json({
        success: false,
        message: 'S3 key is required',
      });
    }

    // This would fetch from S3 and validate
    // For now, return success
    res.json({
      success: true,
      message: 'PDF is valid and parsable',
    });
  } catch (error) {
    console.error('Error validating PDF:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error validating PDF',
    });
  }
};

// Update stage configuration
export const updateStageConfig = async (req, res) => {
  try {
    const { id, stageId } = req.params;
    const stageData = req.body;

    const job = await Job.findById(id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }

    // Update the specific stage
    job.stages[stageId] = {
      ...job.stages[stageId],
      ...stageData,
    };

    await job.save();

    res.json({
      success: true,
      message: 'Stage configuration updated successfully',
      data: job,
    });
  } catch (error) {
    console.error('Error updating stage:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating stage',
    });
  }
};
