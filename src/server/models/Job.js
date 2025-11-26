import mongoose from 'mongoose';

const evaluationRubricSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  weight: { type: Number, default: 0 },
});

const interviewQuestionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  question: { type: String, required: true },
  rubricId: { type: String, required: true },
  expectedAnswer: { type: String },
});

const chatMessageSchema = new mongoose.Schema({
  id: { type: String, required: true },
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const stageConfigSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  enabled: { type: Boolean, default: false },
  locked: { type: Boolean, default: false },
  evaluationRubrics: [evaluationRubricSchema],
  questions: [interviewQuestionSchema],
  chatHistory: [chatMessageSchema],
});

const jobSchema = new mongoose.Schema(
  {
    designation: {
      type: String,
      required: true,
      trim: true,
    },
    jobDescriptionPdf: {
      fileName: { type: String, required: true },
      s3Url: { type: String, required: true },
      s3Key: { type: String, required: true },
      parsedText: { type: String, required: true },
    },
    stages: {
      resume_screening: stageConfigSchema,
      audio_interview: stageConfigSchema,
      assignment: stageConfigSchema,
      personal_interview: stageConfigSchema,
      founders_round: stageConfigSchema,
      rejected: stageConfigSchema,
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'closed'],
      default: 'draft',
    },
    createdBy: {
      type: String,
      default: 'admin',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
jobSchema.index({ designation: 1, createdAt: -1 });
jobSchema.index({ status: 1 });

const Job = mongoose.model('Job', jobSchema);

export default Job;
