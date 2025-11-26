import express from 'express';
import multer from 'multer';
import {
  createJob,
  getJobs,
  getJobById,
  updateJob,
  deleteJob,
  uploadJobDescription,
  validatePdf,
  updateStageConfig,
} from '../controllers/jobController.js';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  },
});

// Job CRUD routes
router.post('/', createJob);
router.get('/', getJobs);
router.get('/:id', getJobById);
router.put('/:id', updateJob);
router.delete('/:id', deleteJob);

// PDF upload and validation
router.post('/upload-pdf', upload.single('pdf'), uploadJobDescription);
router.post('/validate-pdf', validatePdf);

// Stage configuration
router.put('/:id/stages/:stageId', updateStageConfig);

export default router;
