# HackHub: Centralized Hackathon Management System

HackHub is a dual-interface application designed to streamline the process of managing and participating in hackathons for a college community. It bridges the communication gap between faculty coordinators and students by providing a single, organized platform for all hackathon-related activities.

## 🏗️ Project Structure

```
HackHub/
├── server/                 # Backend API (Node.js + Express)
│   ├── index.js           # Server entry point
│   ├── package.json       # Backend dependencies
│   ├── models/           # MongoDB schemas
│   │   ├── User.js
│   │   └── Hackathon.js
│   ├── routes/           # API routes
│   │   ├── auth.js
│   │   ├── hackathons.js
│   │   ├── students.js
│   │   └── analytics.js
│   ├── middleware/       # Custom middleware
│   │   └── auth.js
│   └── services/         # Business logic
│       └── googleAuth.js
├── client/                # Frontend (React + Tailwind CSS)
│   ├── public/           # Static assets
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── contexts/     # React contexts
│   │   ├── services/     # API services
│   │   ├── App.js        # Main app component
│   │   └── index.js      # React entry point
│   ├── package.json      # Frontend dependencies
│   └── tailwind.config.js
├── package.json          # Root workspace manager
└── README.md
```

## ✨ Features

### Faculty Interface
- **Hackathon Management**: Create, edit, and delete hackathon posts
- **Dynamic Content Control**: Full control over hackathon information
- **Detailed Analytics**: Track impressions, registrations, and student engagement
- **Registration Data**: View all registered students with their details
- **Visual Analytics**: Graphical representations of engagement trends

### Student Interface
- **Personalized Profiles**: Create accounts with essential information
- **Curated Hackathon List**: View all available hackathons in real-time
- **Engagement Tracking**: Automatic impression counting
- **Automated Registration**: Monitor email confirmations via Google OAuth
- **New Update Highlights**: Special highlighting for new hackathon updates

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js with Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT tokens with bcryptjs
- **Email Integration**: Google APIs for Gmail monitoring
- **Security**: Helmet, CORS, rate limiting
- **Validation**: Express-validator

### Frontend
- **Framework**: React.js with modern hooks
- **Styling**: Tailwind CSS with custom components
- **Icons**: Lucide React
- **Charts**: Recharts for analytics
- **Forms**: React Hook Form
- **Notifications**: React Hot Toast
- **HTTP Client**: Axios with interceptors

## 🚀 Quick Start

### Prerequisites
- Node.js >= 16.0.0
- npm >= 8.0.0
- MongoDB (local or cloud)

### 1. Clone and Install
```bash
git clone <repository-url>
cd HackHub
npm run install-all
```

### 2. Environment Setup

Create `.env` files in both `server/` and `client/` directories:

**Server Environment (`server/.env`):**
```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
PORT=5000
NODE_ENV=development
```

**Client Environment (`client/.env`):**
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id
```

### 3. Start Development Servers
```bash
# Start both backend and frontend
npm run dev

# Or start individually:
npm run server    # Backend only (port 5000)
npm run client    # Frontend only (port 3000)
```

### 4. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Health Check**: http://localhost:5000/api/health

## 📁 Development Commands

### Root Level (Workspace Manager)
```bash
npm run dev              # Start both servers
npm run install-all      # Install all dependencies
npm run test             # Run tests for both
npm run lint             # Lint both projects
```

### Backend Only
```bash
cd server
npm run dev              # Start with nodemon
npm run start            # Start production server
npm test                 # Run backend tests
npm run lint             # Lint backend code
```

### Frontend Only
```bash
cd client
npm start                # Start development server
npm run build            # Build for production
npm test                 # Run frontend tests
npm run lint             # Lint frontend code
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### Hackathons (Faculty)
- `POST /api/hackathons` - Create hackathon
- `GET /api/hackathons` - Get all hackathons
- `PUT /api/hackathons/:id` - Update hackathon
- `DELETE /api/hackathons/:id` - Delete hackathon

### Students
- `GET /api/hackathons/student` - Get hackathons for students
- `POST /api/hackathons/:id/register` - Register for hackathon
- `GET /api/students/profile` - Get student profile
- `PUT /api/students/profile` - Update student profile

### Analytics
- `GET /api/analytics/hackathon/:id` - Get hackathon analytics
- `GET /api/analytics/overview` - Get faculty overview
- `GET /api/analytics/student-engagement` - Get student engagement data

## 🚀 Deployment

### Backend Deployment
```bash
cd server
npm install --production
npm start
```

### Frontend Deployment
```bash
cd client
npm run build
# Serve the build folder with your preferred server
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
