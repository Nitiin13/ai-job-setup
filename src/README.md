# AI-Powered Job Setup Application (MERN Stack)

A comprehensive mono-repo application for creating and managing AI-powered hiring pipelines. The system integrates with Google Gemini AI to generate intelligent evaluation rubrics and interview questions, stores job descriptions in AWS S3, and maintains all data in MongoDB.

## 🎯 Features

### Frontend (React + TypeScript + Tailwind CSS)
- **Multi-step Wizard Interface**: Intuitive 4-step process for job configuration
- **PDF Upload & Validation**: Drag-and-drop PDF upload with real-time validation
- **Stage Selection**: Choose from 6 hiring stages with mandatory locked stages
- **AI-Powered Rubric Generation**: Chat interface to customize evaluation criteria
- **Question Generation**: Automatic generation of 10 interview questions
- **Real-time Preview**: Live JSON configuration preview
- **Export Functionality**: Download configuration as JSON

### Backend (Node.js + Express + MongoDB)
- **RESTful API**: Complete CRUD operations for job management
- **AWS S3 Integration**: Secure PDF storage and retrieval
- **PDF Text Extraction**: Validates and extracts text from uploaded PDFs
- **Gemini AI Integration**: Intelligent rubric and question generation
- **Chat History Persistence**: Stores all AI conversations for future reference
- **MongoDB Storage**: Structured data storage with indexes

## 🏗️ Architecture

```
job-setup-app/
├── src/                          # Frontend (React)
│   ├── components/
│   │   ├── JobSetupWizard.tsx
│   │   ├── JobDetailsStep.tsx
│   │   ├── StageSelectionStep.tsx
│   │   ├── RubricConfigurationStep.tsx
│   │   ├── AIRubricChat.tsx
│   │   └── ReviewStep.tsx
│   ├── services/
│   │   └── api.ts                # API service layer
│   ├── types/
│   │   └── job-setup.ts          # TypeScript interfaces
│   └── App.tsx
│
└── server/                        # Backend (Express)
    ├── controllers/
    │   ├── jobController.js      # Job CRUD operations
    │   └── aiController.js       # AI operations
    ├── models/
    │   └── Job.js                # MongoDB schema
    ├── routes/
    │   ├── jobRoutes.js
    │   └── aiRoutes.js
    ├── utils/
    │   ├── s3Utils.js            # AWS S3 operations
    │   └── pdfUtils.js           # PDF processing
    ├── middleware/
    │   ├── errorHandler.js
    │   └── validateRequest.js
    └── server.js                 # Express app entry
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- AWS Account with S3
- Google Gemini API key

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd job-setup-app
```

2. **Setup Frontend**
```bash
# Install frontend dependencies
npm install

# Create frontend .env file
cp .env.example .env

# Update VITE_API_URL in .env
# VITE_API_URL=http://localhost:5000/api
```

3. **Setup Backend**
```bash
# Navigate to server directory
cd server

# Install backend dependencies
npm install

# Create backend .env file
cp .env.example .env

# Update .env with your credentials:
# - MONGODB_URI
# - AWS credentials (ACCESS_KEY_ID, SECRET_ACCESS_KEY, REGION, BUCKET_NAME)
# - GEMINI_API_KEY
```

4. **Configure AWS S3**
```bash
# Create an S3 bucket
aws s3 mb s3://job-setup-bucket

# Update bucket name in server/.env
S3_BUCKET_NAME=job-setup-bucket
```

5. **Setup MongoDB**

**Option A: Local MongoDB**
```bash
# Start MongoDB
mongod

# Connection string:
# mongodb://localhost:27017/job-setup-app
```

**Option B: MongoDB Atlas**
1. Create cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Get connection string
3. Update `MONGODB_URI` in `server/.env`

6. **Get Gemini API Key**
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create new API key
3. Add to `server/.env` as `GEMINI_API_KEY`

### Running the Application

1. **Start Backend Server**
```bash
cd server
npm run dev
# Server runs on http://localhost:5000
```

2. **Start Frontend** (in new terminal)
```bash
npm run dev
# Frontend runs on http://localhost:5173
```

## 📋 How It Works

### Step 1: Job Details
1. Enter job designation (e.g., "Senior Software Engineer")
2. Upload job description PDF
3. System validates PDF is parsable to text
4. PDF uploads to S3 and text is extracted

### Step 2: Stage Selection
- **Locked Stages** (mandatory):
  - Resume Screening
  - Rejected
- **Optional Stages** (select as needed):
  - Audio Interview
  - Assignment
  - Personal Interview
  - Founders Round

### Step 3: Configure Rubrics
For each selected stage:
1. AI suggests evaluation rubrics based on job description
2. Chat with AI to customize rubrics:
   - Add new rubrics
   - Modify existing ones
   - Remove irrelevant criteria
   - Adjust weights
3. For Audio Interview: Generate 10 interview questions
4. All chat history is saved

### Step 4: Review & Submit
- Preview complete JSON configuration
- Copy or download configuration
- Submit to MongoDB
- PDF stored in S3, metadata in database

## 📊 Data Structure

### Final JSON Output
```json
{
  "designation": "Senior Software Engineer",
  "job_description": {
    "file_name": "job-description.pdf",
    "s3_url": "https://...",
    "parsed_text": "..."
  },
  "stages": {
    "resume_screening": {
      "enabled": true,
      "locked": true,
      "evaluation_rubrics": [
        {
          "name": "Quantifiable Achievements",
          "description": "...",
          "weight": 25
        }
      ],
      "chat_history": [...]
    },
    "audio_interview": {
      "enabled": true,
      "evaluation_rubrics": [...],
      "questions": [
        {
          "question": "...",
          "rubric_id": "..."
        }
      ],
      "chat_history": [...]
    }
  }
}
```

## 🔌 API Endpoints

### Job Management
- `POST /api/jobs` - Create job
- `GET /api/jobs` - List jobs
- `GET /api/jobs/:id` - Get job by ID
- `PUT /api/jobs/:id` - Update job
- `DELETE /api/jobs/:id` - Delete job
- `POST /api/jobs/upload-pdf` - Upload PDF

### AI Operations
- `POST /api/ai/generate-rubrics` - Generate evaluation rubrics
- `POST /api/ai/chat` - Chat with AI to modify rubrics
- `POST /api/ai/generate-questions` - Generate interview questions
- `POST /api/ai/analyze-job-description` - Analyze JD

## 🧪 Testing

### Test PDF Upload
```bash
curl -X POST http://localhost:5000/api/jobs/upload-pdf \
  -F "pdf=@job-description.pdf"
```

### Test Rubric Generation
```bash
curl -X POST http://localhost:5000/api/ai/generate-rubrics \
  -H "Content-Type: application/json" \
  -d '{
    "stageId": "resume_screening",
    "designation": "Senior Software Engineer",
    "jobDescription": "..."
  }'
```

## 🔒 Environment Variables

### Frontend (.env)
```env
VITE_API_URL=http://localhost:5000/api
```

### Backend (server/.env)
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/job-setup-app
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=job-setup-bucket
GEMINI_API_KEY=your_gemini_key
```

## 📦 Tech Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Lucide Icons** - Icon library
- **Vite** - Build tool

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **AWS SDK v3** - S3 integration
- **pdf-parse** - PDF text extraction
- **@google/generative-ai** - Gemini AI
- **Multer** - File uploads

## 🎨 Key Features Explained

### PDF Validation
- Checks file type is PDF
- Uploads to S3
- Extracts text using pdf-parse
- Validates text extraction quality
- Rejects scanned/image-only PDFs

### AI Integration
- Uses Gemini Pro model
- Context-aware conversations
- Structured JSON responses
- Fallback to default values
- Conversation history persistence

### Stage Management
- Locked mandatory stages
- Dynamic stage selection
- Per-stage rubric configuration
- Independent chat history per stage

## 🚧 Future Enhancements

- [ ] Authentication & Authorization (JWT)
- [ ] Role-based access control
- [ ] Candidate application tracking
- [ ] Real-time collaboration (WebSockets)
- [ ] Email notifications
- [ ] Dashboard analytics
- [ ] Bulk job creation
- [ ] Template management
- [ ] Interview scheduling
- [ ] Automated scoring

## 📄 License

ISC

## 🤝 Contributing

Contributions welcome! Please read contributing guidelines first.

## 📧 Support

For issues and questions, please open a GitHub issue.
