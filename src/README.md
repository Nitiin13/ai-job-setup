# Job Setup Application - AI-Powered Hiring Workflow Management

A comprehensive MERN stack mono-repo application that integrates with Gemini AI for intelligent hiring workflow management. Create job postings, configure multi-stage interview processes, and leverage AI to generate evaluation rubrics and interview questions.

## Features

- 📄 **PDF Job Description Upload** - Upload and parse job descriptions with S3 storage
- 🎯 **Multi-Stage Interview Pipeline** - Configure resume screening, audio interview, assignment, personal interview, and founders round
- 🤖 **Gemini AI Integration** - AI-suggested evaluation rubrics and interview questions
- 💬 **Interactive Chat Interface** - Customize rubrics and questions through conversational AI
- 🎨 **Drag & Drop Reordering** - Reorder interview stages and questions (with locked positions for mandatory stages)
- ✏️ **Individual Editing** - Edit rubrics and questions inline
- 📊 **MongoDB Storage** - Structured JSON format for all job setup data

## Tech Stack

### Frontend
- React with TypeScript
- Tailwind CSS
- Lucide React (icons)
- Native HTML5 Drag & Drop

### Backend
- Node.js + Express.js
- MongoDB (Mongoose)
- AWS S3 (file storage)
- Google Gemini AI (gemini-2.0-flash-exp)

## Prerequisites

Before deploying, ensure you have:

1. **Vercel Account** - [Sign up here](https://vercel.com)
2. **MongoDB Atlas Account** - [Sign up here](https://www.mongodb.com/cloud/atlas)
3. **AWS Account** - [Sign up here](https://aws.amazon.com)
4. **Google Cloud Account** - [Sign up here](https://console.cloud.google.com)
5. **Git** installed locally
6. **Node.js** (v18 or higher) installed

## Setup Instructions

### 1. Clone and Setup Repository

```bash
# Clone your repository
git clone <your-repo-url>
cd <your-repo-name>

# Install dependencies for frontend
npm install

# Install dependencies for backend
cd server
npm install
cd ..
```

### 2. MongoDB Atlas Setup

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster (free tier available)
3. Click **"Connect"** → **"Connect your application"**
4. Copy the connection string (format: `mongodb+srv://<username>:<password>@cluster.mongodb.net/<dbname>`)
5. Replace `<password>` with your database password
6. Replace `<dbname>` with your preferred database name (e.g., `job-setup-db`)

### 3. AWS S3 Setup

1. Go to [AWS Console](https://console.aws.amazon.com)
2. Navigate to **S3** → **Create bucket**
3. Bucket name: `job-setup-pdfs-<unique-id>` (must be globally unique)
4. Region: Choose closest to your users (e.g., `us-east-1`)
5. **Block Public Access**: Keep all blocked (we'll use signed URLs)
6. Click **"Create bucket"**

#### Create IAM User for S3 Access

1. Go to **IAM** → **Users** → **Create user**
2. User name: `job-setup-s3-user`
3. Attach policy: **AmazonS3FullAccess** (or create a custom policy with specific bucket access)
4. Create user and go to **Security credentials**
5. Click **"Create access key"** → Choose **"Application running outside AWS"**
6. Copy **Access Key ID** and **Secret Access Key** (save these securely!)

### 4. Google Gemini AI Setup

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click **"Get API Key"** → **"Create API key in new project"**
3. Copy the generated API key (starts with `AIza...`)

### 5. Environment Variables Setup

Create `.env` file in the `/server` directory:

```bash
# Server Configuration
PORT=5000
NODE_ENV=production

# MongoDB
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/job-setup-db?retryWrites=true&w=majority

# AWS S3
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=job-setup-pdfs-<unique-id>

# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# CORS (Update with your frontend URL after deployment)
CORS_ORIGIN=https://your-app.vercel.app
```

Create `.env` file in the **root directory** (frontend):

```bash
# Backend API URL (Update after deploying backend)
VITE_API_URL=https://your-backend-url.com/api
```

## Deployment Steps

### Option 1: Deploy Both Frontend & Backend on Vercel

#### Step 1: Deploy Backend as Serverless Functions

1. Create `vercel.json` in the **root directory**:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "server/index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "server/index.js"
    },
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ]
}
```

2. Update `server/index.js` to export the Express app:

```javascript
// At the end of server/index.js
module.exports = app;
```

#### Step 2: Deploy to Vercel

1. **Install Vercel CLI** (optional but recommended):
```bash
npm install -g vercel
```

2. **Login to Vercel**:
```bash
vercel login
```

3. **Deploy**:
```bash
vercel
```

4. Follow the prompts:
   - **Set up and deploy?** Yes
   - **Which scope?** Select your account
   - **Link to existing project?** No
   - **Project name?** job-setup-app (or your preferred name)
   - **Directory?** ./ (root)
   - **Override settings?** No

5. **Add Environment Variables** in Vercel Dashboard:
   - Go to your project → **Settings** → **Environment Variables**
   - Add all variables from your `.env` files:
     - `MONGODB_URI`
     - `AWS_ACCESS_KEY_ID`
     - `AWS_SECRET_ACCESS_KEY`
     - `AWS_REGION`
     - `AWS_S3_BUCKET_NAME`
     - `GEMINI_API_KEY`
     - `CORS_ORIGIN` (set to your Vercel frontend URL)
     - `VITE_API_URL` (set to your Vercel deployment URL + `/api`)

6. **Redeploy** after adding environment variables:
```bash
vercel --prod
```

### Option 2: Deploy Frontend on Vercel, Backend Elsewhere

If you prefer to deploy the backend separately (recommended for complex APIs):

#### Backend Deployment Options:
- **Railway** - [railway.app](https://railway.app)
- **Render** - [render.com](https://render.com)
- **Heroku** - [heroku.com](https://heroku.com)
- **AWS EC2/Elastic Beanstalk**
- **DigitalOcean App Platform**

#### Frontend Deployment on Vercel:

1. Create a new repository **only for frontend** or use Vercel's monorepo support

2. **Deploy via Vercel Dashboard**:
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click **"Add New Project"**
   - Import your Git repository
   - **Framework Preset**: Vite
   - **Root Directory**: ./ (or leave empty if frontend is in root)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

3. **Add Environment Variables**:
   - `VITE_API_URL`: Your backend URL (e.g., `https://your-backend.railway.app/api`)

4. Click **"Deploy"**

### Step 3: Configure CORS

Update your backend's CORS configuration to allow requests from your Vercel frontend:

```javascript
// server/index.js or server/app.js
const cors = require('cors');

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'https://your-app.vercel.app',
  credentials: true
}));
```

### Step 4: Verify Deployment

1. **Frontend**: Visit your Vercel URL (e.g., `https://your-app.vercel.app`)
2. **Backend Health Check**: Visit `https://your-backend-url/api/health`
3. **Test Features**:
   - Upload a PDF job description
   - Select interview stages
   - Configure rubrics with AI chat
   - Generate interview questions
   - Test drag & drop functionality

## Project Structure

```
job-setup-app/
├── components/              # React components
│   ├── AIRubricChat.tsx    # AI chat interface for rubrics & questions
│   ├── StageSelectionStep.tsx  # Stage selection with drag & drop
│   ├── JobDescriptionStep.tsx  # PDF upload
│   └── ReviewStep.tsx      # Final review
├── server/                 # Backend API
│   ├── controllers/
│   │   ├── aiController.js     # Gemini AI integration
│   │   ├── jobController.js    # Job CRUD operations
│   │   └── uploadController.js # PDF upload & S3
│   ├── models/
│   │   └── Job.js          # MongoDB schema
│   ├── routes/
│   │   ├── aiRoutes.js
│   │   ├── jobRoutes.js
│   │   └── uploadRoutes.js
│   ├── utils/
│   │   └── s3Utils.js      # AWS S3 utilities
│   └── index.js            # Express server
├── services/
│   └── api.ts              # Frontend API client
├── types/
│   └── job-setup.ts        # TypeScript interfaces
├── .env                    # Frontend environment variables
├── server/.env             # Backend environment variables
├── .gitignore
├── package.json
├── vercel.json             # Vercel configuration
└── README.md
```

## Environment Variables Reference

### Backend (.env in /server)

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `NODE_ENV` | Environment | `production` |
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/db` |
| `AWS_ACCESS_KEY_ID` | AWS access key | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | `abc123...` |
| `AWS_REGION` | AWS region | `us-east-1` |
| `AWS_S3_BUCKET_NAME` | S3 bucket name | `job-setup-pdfs-12345` |
| `GEMINI_API_KEY` | Google Gemini API key | `AIza...` |
| `CORS_ORIGIN` | Allowed frontend origin | `https://your-app.vercel.app` |

### Frontend (.env in root)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `https://your-backend.com/api` |

## Troubleshooting

### Build Failures

**Issue**: Build fails with module errors
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### CORS Errors

**Issue**: Frontend can't connect to backend
- Ensure `CORS_ORIGIN` in backend matches your Vercel frontend URL
- Check that backend is deployed and accessible
- Verify `VITE_API_URL` in frontend environment variables

### PDF Upload Failures

**Issue**: PDF upload returns 500 error
- Verify AWS credentials are correct
- Check S3 bucket name matches environment variable
- Ensure IAM user has S3 write permissions
- Check bucket region matches `AWS_REGION`

### MongoDB Connection Issues

**Issue**: Database connection timeout
- Verify MongoDB Atlas IP whitelist (add `0.0.0.0/0` for all IPs in production)
- Check connection string format
- Ensure database user has read/write permissions

### Gemini AI Errors

**Issue**: AI features not working
- Verify API key is correct and active
- Check Google Cloud project has Gemini API enabled
- Monitor API quota limits

## Security Best Practices

1. **Never commit `.env` files** - Use `.env.example` templates instead
2. **Rotate API keys** regularly
3. **Use IAM roles** with minimal required permissions
4. **Enable MongoDB IP whitelist** in production
5. **Use HTTPS** for all API communications
6. **Sanitize user inputs** before processing
7. **Implement rate limiting** on API endpoints
8. **Monitor AWS costs** and set billing alerts

## Development

### Local Development

```bash
# Terminal 1 - Frontend
npm run dev

# Terminal 2 - Backend
cd server
npm run dev
```

Frontend: `http://localhost:5173`  
Backend: `http://localhost:5000`

### Build for Production

```bash
# Frontend
npm run build

# Backend (if needed)
cd server
npm run build  # If you have a build script
```

## Support

For issues and questions:
- Check the troubleshooting section above
- Review Vercel deployment logs
- Check MongoDB Atlas monitoring
- Review AWS CloudWatch logs (for S3 issues)

## License

[Your License Here]

## Contributors

[Your Name/Team]

---

**Last Updated**: November 26, 2025
