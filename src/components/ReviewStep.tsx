import { useState } from 'react';
import { CheckCircle, Download, Copy, Check } from 'lucide-react';
import { JobSetupData } from '../types/job-setup';
import { jobAPI } from '../services/api';

interface ReviewStepProps {
  jobData: JobSetupData;
  onBack: () => void;
}

export function ReviewStep({ jobData, onBack }: ReviewStepProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Build the final JSON structure
  const finalConfig = buildFinalConfig(jobData);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Submit to backend API
      const result = await jobAPI.createJob(jobData);
      
      if (result.success) {
        setIsSubmitted(true);
      }
    } catch (err: any) {
      console.error('Error submitting job:', err);
      setError(err.message || 'Failed to submit job configuration');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyJSON = () => {
    navigator.clipboard.writeText(JSON.stringify(finalConfig, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadJSON = () => {
    const blob = new Blob([JSON.stringify(finalConfig, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `job-setup-${jobData.designation.toLowerCase().replace(/\s+/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isSubmitted) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="mb-2 text-slate-900">Job Setup Complete!</h2>
        <p className="text-slate-600 mb-6">
          Your AI-powered hiring pipeline has been configured successfully.
        </p>
        <div className="max-w-md mx-auto p-4 bg-slate-50 rounded-lg border border-slate-200">
          <p className="text-sm text-slate-700 mb-2">Next Steps:</p>
          <ul className="text-sm text-slate-600 text-left space-y-1">
            <li>• Configuration saved to MongoDB</li>
            <li>• Job description stored in S3</li>
            <li>• AI evaluation models initialized</li>
            <li>• Ready to receive applications</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-slate-900">Review Configuration</h2>
        <p className="text-slate-600">Review your job setup and final JSON structure before submitting</p>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="text-slate-900 mb-2">Job Details</h3>
          <p className="text-sm text-slate-700 mb-1">
            <strong>Designation:</strong> {jobData.designation}
          </p>
          <p className="text-sm text-slate-700">
            <strong>Job Description:</strong> {jobData.jobDescriptionPdf?.fileName}
          </p>
        </div>

        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <h3 className="text-slate-900 mb-2">Pipeline Stages</h3>
          <div className="text-sm text-slate-700 space-y-1">
            {Object.values(jobData.stages)
              .filter((s) => s.enabled)
              .map((stage) => (
                <div key={stage.id}>
                  • {stage.name} ({stage.evaluationRubrics.length} rubrics)
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* JSON Preview */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-slate-900">Final JSON Configuration</h3>
          <div className="flex gap-2">
            <button
              onClick={handleCopyJSON}
              className="px-3 py-1 text-sm border border-slate-300 text-slate-700 rounded hover:bg-slate-50 transition-colors flex items-center gap-2"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={handleDownloadJSON}
              className="px-3 py-1 text-sm border border-slate-300 text-slate-700 rounded hover:bg-slate-50 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
          </div>
        </div>
        <div className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto max-h-96 overflow-y-auto">
          <pre className="text-xs">{JSON.stringify(finalConfig, null, 2)}</pre>
        </div>
      </div>

      {/* Storage Info */}
      <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        <h3 className="text-slate-900 mb-2">Storage Details</h3>
        <div className="text-sm text-slate-700 space-y-1">
          <p>• Job Description PDF: S3 Bucket (job-setup-bucket)</p>
          <p>• Configuration: MongoDB (jobs collection)</p>
          <p>• AI Chat History: Stored for future reference</p>
          <p>• Gemini API: Integrated for real-time evaluation</p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <button
          onClick={onBack}
          disabled={isSubmitting}
          className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          Back
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5" />
              Submit Configuration
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function buildFinalConfig(jobData: JobSetupData) {
  const stages: any = {};

  Object.entries(jobData.stages).forEach(([key, stage]) => {
    if (stage.enabled) {
      stages[key] = {
        enabled: true,
        locked: stage.locked,
        evaluation_rubrics: stage.evaluationRubrics.map((rubric) => ({
          name: rubric.name,
          description: rubric.description,
          weight: rubric.weight,
        })),
        ...(stage.questions && stage.questions.length > 0 && {
          questions: stage.questions.map((q) => ({
            question: q.question,
            rubric_id: q.rubricId,
          })),
        }),
        chat_history: stage.chatHistory.map((msg) => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp.toISOString(),
        })),
      };
    }
  });

  return {
    designation: jobData.designation,
    job_description: {
      file_name: jobData.jobDescriptionPdf?.fileName,
      s3_url: jobData.jobDescriptionPdf?.s3Url,
      parsed_text: jobData.jobDescriptionPdf?.parsedText,
    },
    stages,
    created_at: new Date().toISOString(),
    gemini_integration: {
      model: 'gemini-2.0-flash-exp',
      api_endpoint: 'https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash-exp',
    },
  };
}