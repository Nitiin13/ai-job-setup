import { useState } from 'react';
import { Upload, FileText, Check, AlertCircle, Loader2 } from 'lucide-react';
import { JobSetupData } from '../types/job-setup';
import { jobAPI } from '../services/api';

interface JobDetailsStepProps {
  jobData: JobSetupData;
  setJobData: (data: JobSetupData) => void;
  onNext: () => void;
}

export function JobDetailsStep({ jobData, setJobData, onNext }: JobDetailsStepProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.type !== 'application/pdf') {
      setErrorMessage('Please upload a PDF file');
      setValidationStatus('error');
      return;
    }

    setFile(selectedFile);
    setIsUploading(true);
    setValidationStatus('idle');
    setErrorMessage('');

    try {
      // Upload PDF to backend (S3)
      const result = await jobAPI.uploadPdf(selectedFile);
      
      setIsUploading(false);
      
      if (result.success) {
        setJobData({
          ...jobData,
          jobDescriptionPdf: {
            fileName: result.data.fileName,
            s3Url: result.data.s3Url,
            parsedText: result.data.parsedText,
          },
        });
        setValidationStatus('success');
      }
    } catch (error: any) {
      setIsUploading(false);
      setValidationStatus('error');
      setErrorMessage(error.message || 'Failed to upload and validate PDF');
    }
  };

  const canProceed = jobData.designation.trim() !== '' && validationStatus === 'success';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-slate-900">Job Details</h2>
        <p className="text-slate-600">Provide the designation and job description PDF</p>
      </div>

      {/* Designation Input */}
      <div>
        <label className="block mb-2 text-slate-700">
          Designation <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={jobData.designation}
          onChange={(e) => setJobData({ ...jobData, designation: e.target.value })}
          placeholder="e.g., Senior Software Engineer"
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* PDF Upload */}
      <div>
        <label className="block mb-2 text-slate-700">
          Job Description PDF <span className="text-red-500">*</span>
        </label>
        <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="hidden"
            id="pdf-upload"
          />
          <label htmlFor="pdf-upload" className="cursor-pointer">
            <div className="flex flex-col items-center">
              {isUploading || isValidating ? (
                <>
                  <Loader2 className="w-12 h-12 text-blue-500 mb-4 animate-spin" />
                  <p className="text-slate-700 mb-1">
                    {isUploading ? 'Uploading to S3 & validating...' : 'Validating PDF...'}
                  </p>
                  <p className="text-sm text-slate-500">
                    {isUploading ? 'Please wait while we process your file' : 'Checking if PDF is parsable to text'}
                  </p>
                </>
              ) : validationStatus === 'success' ? (
                <>
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <Check className="w-6 h-6 text-green-600" />
                  </div>
                  <p className="text-slate-700 mb-1">{file?.name}</p>
                  <p className="text-sm text-green-600 mb-2">✓ PDF validated and parsed successfully</p>
                  <p className="text-xs text-slate-500">Stored at: {jobData.jobDescriptionPdf?.s3Url}</p>
                  <button className="mt-4 text-sm text-blue-600 hover:text-blue-700">
                    Upload different file
                  </button>
                </>
              ) : validationStatus === 'error' ? (
                <>
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <p className="text-red-600 mb-2">{errorMessage || 'Failed to parse PDF'}</p>
                  <button className="text-sm text-blue-600 hover:text-blue-700">
                    Try again
                  </button>
                </>
              ) : (
                <>
                  <Upload className="w-12 h-12 text-slate-400 mb-4" />
                  <p className="text-slate-700 mb-1">Click to upload or drag and drop</p>
                  <p className="text-sm text-slate-500">PDF file only (max 10MB)</p>
                </>
              )}
            </div>
          </label>
        </div>

        {validationStatus === 'success' && jobData.jobDescriptionPdf && (
          <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-slate-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-slate-700 mb-1">Parsed Content Preview:</p>
                <pre className="text-xs text-slate-600 whitespace-pre-wrap max-h-32 overflow-y-auto">
                  {jobData.jobDescriptionPdf.parsedText.substring(0, 300)}...
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-end pt-4">
        <button
          onClick={onNext}
          disabled={!canProceed}
          className={`px-6 py-3 rounded-lg transition-colors ${
            canProceed
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          Continue to Stage Selection
        </button>
      </div>
    </div>
  );
}