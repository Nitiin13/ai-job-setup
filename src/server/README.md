# Job Setup Backend API

Backend API for the AI-powered job setup application using Express, MongoDB, AWS S3, and Google Gemini AI.

## Features

- **Job Management**: Create, read, update, and delete job configurations
- **PDF Upload & Validation**: Upload job descriptions to S3 and validate text extraction
- **AI-Powered Rubrics**: Generate evaluation rubrics using Gemini AI
- **Interactive AI Chat**: Chat with AI to customize rubrics
- **Question Generation**: Generate interview questions based on rubrics
- **MongoDB Integration**: Store all job configurations and chat history

## Prerequisites

- Node.js 18+ 
- MongoDB (local or MongoDB Atlas)
- AWS Account with S3 access
- Google Gemini API key

## Installation

1. Navigate to the server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Update the `.env` file with your credentials:
   - MongoDB connection string
   - AWS credentials and S3 bucket name
   - Gemini API key

## Running the Server

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:5000` (or your specified PORT).

## API Endpoints

### Job Management

#### Create Job
```http
POST /api/jobs
Content-Type: application/json

{
  "designation": "Senior Software Engineer",
  "jobDescriptionPdf": {
    "fileName": "job-description.pdf",
    "s3Url": "https://...",
    "s3Key": "...",
    "parsedText": "..."
  },
  "stages": { ... }
}
```

#### Get All Jobs
```http
GET /api/jobs?status=active&page=1&limit=10
```

#### Get Job by ID
```http
GET /api/jobs/:id
```

#### Update Job
```http
PUT /api/jobs/:id
Content-Type: application/json

{
  "status": "active"
}
```

#### Delete Job
```http
DELETE /api/jobs/:id
```

### PDF Upload

#### Upload Job Description PDF
```http
POST /api/jobs/upload-pdf
Content-Type: multipart/form-data

pdf: <file>
```

Response:
```json
{
  "success": true,
  "data": {
    "fileName": "job-description.pdf",
    "s3Url": "https://...",
    "s3Key": "job-descriptions/...",
    "parsedText": "..."
  }
}
```

### AI Operations

#### Generate Rubrics
```http
POST /api/ai/generate-rubrics
Content-Type: application/json

{
  "stageId": "resume_screening",
  "designation": "Senior Software Engineer",
  "jobDescription": "...",
  "existingRubrics": []
}
```

#### Chat with AI
```http
POST /api/ai/chat
Content-Type: application/json

{
  "message": "Add a rubric for account management",
  "stageId": "resume_screening",
  "designation": "Senior Software Engineer",
  "currentRubrics": [...],
  "chatHistory": [...]
}
```

#### Generate Interview Questions
```http
POST /api/ai/generate-questions
Content-Type: application/json

{
  "stageId": "audio_interview",
  "designation": "Senior Software Engineer",
  "rubrics": [...],
  "jobDescription": "..."
}
```

#### Analyze Job Description
```http
POST /api/ai/analyze-job-description
Content-Type: application/json

{
  "designation": "Senior Software Engineer",
  "jobDescription": "..."
}
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| PORT | Server port (default: 5000) | No |
| MONGODB_URI | MongoDB connection string | Yes |
| AWS_ACCESS_KEY_ID | AWS access key | Yes |
| AWS_SECRET_ACCESS_KEY | AWS secret key | Yes |
| AWS_REGION | AWS region (default: us-east-1) | No |
| S3_BUCKET_NAME | S3 bucket name | Yes |
| GEMINI_API_KEY | Google Gemini API key | Yes |

## AWS S3 Setup

1. Create an S3 bucket (e.g., `job-setup-bucket`)
2. Configure bucket permissions for file uploads
3. Update IAM user permissions to allow S3 operations
4. Add credentials to `.env` file

## Gemini AI Setup

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add the key to `.env` file as `GEMINI_API_KEY`

## MongoDB Setup

### Local MongoDB
```bash
# Start MongoDB
mongod

# The connection string will be:
# mongodb://localhost:27017/job-setup-app
```

### MongoDB Atlas
1. Create a cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Get your connection string
3. Replace `<username>`, `<password>`, and database name
4. Add to `.env` file

## Data Models

### Job Schema
```javascript
{
  designation: String,
  jobDescriptionPdf: {
    fileName: String,
    s3Url: String,
    s3Key: String,
    parsedText: String
  },
  stages: {
    resume_screening: StageConfig,
    audio_interview: StageConfig,
    assignment: StageConfig,
    personal_interview: StageConfig,
    founders_round: StageConfig,
    rejected: StageConfig
  },
  status: String, // 'draft' | 'active' | 'closed'
  createdBy: String,
  timestamps: true
}
```

### Stage Config Schema
```javascript
{
  id: String,
  name: String,
  enabled: Boolean,
  locked: Boolean,
  evaluationRubrics: [EvaluationRubric],
  questions: [InterviewQuestion],
  chatHistory: [ChatMessage]
}
```

## Error Handling

All API responses follow this structure:

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "errors": ["Detailed error 1", "Detailed error 2"]
}
```

## Testing with cURL

### Upload PDF
```bash
curl -X POST http://localhost:5000/api/jobs/upload-pdf \
  -F "pdf=@/path/to/job-description.pdf"
```

### Create Job
```bash
curl -X POST http://localhost:5000/api/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "designation": "Senior Software Engineer",
    "jobDescriptionPdf": { ... }
  }'
```

### Generate Rubrics
```bash
curl -X POST http://localhost:5000/api/ai/generate-rubrics \
  -H "Content-Type: application/json" \
  -d '{
    "stageId": "resume_screening",
    "designation": "Senior Software Engineer"
  }'
```

## Security Considerations

- Always use environment variables for sensitive data
- Implement authentication middleware (JWT recommended)
- Use HTTPS in production
- Validate and sanitize all inputs
- Implement rate limiting for AI endpoints
- Set appropriate CORS policies
- Use S3 bucket policies to restrict access

## Future Enhancements

- [ ] Add authentication and authorization
- [ ] Implement rate limiting
- [ ] Add request logging
- [ ] Implement caching for AI responses
- [ ] Add WebSocket support for real-time updates
- [ ] Implement job application tracking
- [ ] Add email notifications
- [ ] Create admin dashboard API

## License

ISC
