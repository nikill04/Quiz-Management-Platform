# 🔍 Detailed Code Walkthrough - Key Backend Files

## File 1: index.js (Server Entry Point)

### Complete Code with Line-by-Line Explanation

```javascript
// IMPORTS
import express from 'express';           // Web framework for Node.js
import mongoose from 'mongoose';         // MongoDB ODM (Object Data Modeling)
import dotenv from 'dotenv';             // Load environment variables from .env file
import cors from 'cors';                 // Enable Cross-Origin Resource Sharing
import path from 'path';                 // File path utilities
import cookieParser from 'cookie-parser'; // Parse cookies from requests

// Import all route files
import authRoutes from './routes/authRoutes.js';       // Authentication routes (/login, /register)
import studentRouter from './routes/studentRoutes.js'; // Student-specific routes
import teacherRouter from './routes/teacherRoutes.js'; // Teacher-specific routes
import aiRouter from './routes/aiRoutes.js';           // AI-related routes

// Import Swagger for API documentation
import { swaggerUi, swaggerSpec } from './swagger/swagger.js';

// CONFIGURATION
dotenv.config();  // Load .env file into process.env

// Create Express application instance
const app = express();

// Set server port (from .env or default 5000)
const PORT = process.env.PORT || 5000;

// ==================== MIDDLEWARE ====================
// Middleware = Functions that execute BEFORE your route handlers

// 1. Parse incoming JSON data
app.use(express.json());
// Example: POST request body { "name": "John" } becomes req.body.name

// 2. Parse URL-encoded data (form submissions)
app.use(express.urlencoded({ extended: true }));
// Example: Form data key=value&key2=value2

// 3. Parse cookies from requests
app.use(cookieParser());
// Example: Cookie header "token=abc123" becomes req.cookies.token

// 4. Enable CORS (Cross-Origin Resource Sharing)
app.use(
  cors({
    origin: ['http://localhost:5173', 'https://quizapp-frontend-8z3w.onrender.com'],
    // Only these frontend URLs can access this API
    credentials: true,
    // Allow cookies to be sent with requests
  })
);

// ==================== SWAGGER DOCUMENTATION ====================
// API documentation accessible at /api-docs
app.use('/api-docs', swaggerUi.serve);
app.get('/api-docs', swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
}));

// ==================== ROUTES ====================
// Mount route handlers on specific paths
app.use('/api/auth', authRoutes);
// All routes in authRoutes will start with /api/auth
// Example: POST /api/auth/register, POST /api/auth/login

app.use('/api/student', studentRouter);
// Example: GET /api/student/active-quizzes

app.use('/api/teacher', teacherRouter);
// Example: POST /api/teacher/create-batch

app.use('/api/ai', aiRouter);
// Example: POST /api/ai/generate-quiz

// ==================== DATABASE + SERVER ====================
// Function to connect to MongoDB and start server
const connectDB = async () => {
  try {
    // Connect to MongoDB using connection string from .env
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected");

    // Start Express server only AFTER successful DB connection
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
      console.log(`API Docs: http://localhost:${PORT}/api-docs`);
    });
  } catch (err) {
    // If connection fails, log error and exit
    console.error(`Error: ${err.message}`);
    process.exit(1); // Exit with failure code
  }
};

// Execute the connection function
connectDB();
```

### Key Concepts:
1. **Middleware Order Matters**: They execute in the order they're defined
2. **Route Mounting**: All routes are organized in separate files
3. **Async Connection**: Database connects before server starts
4. **Error Handling**: If DB fails, server doesn't start

---

## File 2: models/User.js

```javascript
import mongoose from 'mongoose';

// Define the structure of User documents
const userSchema = new mongoose.Schema({
  // User's full name
  name: String,  // Simple string field
  
  // Email address (must be unique across all users)
  email: { 
    type: String, 
    unique: true  // MongoDB will enforce uniqueness
  },
  
  // Hashed password (NEVER store plain passwords!)
  password: String,
  
  // User type: either 'student' or 'teacher'
  role: { 
    type: String, 
    enum: ['student', 'teacher'],  // Only these values allowed
    default: 'student'  // If not specified, assume student
  },
  
  // Array of Batch IDs this user belongs to
  batches: [{ 
    type: mongoose.Schema.Types.ObjectId,  // Reference to Batch document
    ref: 'Batch'  // Points to 'Batch' model
  }]
});

// Create an index on email field for faster lookups
// When you do User.findOne({ email: 'test@email.com' })
// MongoDB will use this index instead of scanning all documents
userSchema.index({ email: 1 });  // 1 = ascending order

// Create the model from schema
const User = mongoose.model('User', userSchema);

export default User;
```

### Understanding ObjectId References:
```javascript
// Example User document in database:
{
  _id: ObjectId("507f1f77bcf86cd799439011"),
  name: "John Doe",
  email: "john@example.com",
  password: "$2a$10$hashedpassword...",
  role: "student",
  batches: [
    ObjectId("507f191e810c19729de860ea"),  // Reference to Batch
    ObjectId("507f191e810c19729de860eb")   // Reference to another Batch
  ]
}

// To get batch details, use populate():
const user = await User.findById(userId).populate('batches');
// Now user.batches will contain full Batch objects, not just IDs
```

---

## File 3: middleware/auth.js

```javascript
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// ===== MIDDLEWARE 1: Verify JWT Token =====
export const protect = async (req, res, next) => {
  try {
    // 1. Get token from cookies
    const token = req.cookies.token;
    
    // 2. Check if token exists
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Not authenticated' 
      });
    }

    // 3. Verify token and decode payload
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // If token is valid, decoded = { id: "userId", role: "student", iat: timestamp }
    // If invalid, jwt.verify() throws error → caught by catch block

    // 4. Find user from decoded ID
    const user = await User.findById(decoded.id).select('-password');
    // .select('-password') excludes password field from result
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // 5. Attach user to request object
    req.user = user;
    // Now all subsequent middleware/controllers can access req.user

    // 6. Continue to next middleware/controller
    next();
    
  } catch (error) {
    // Token verification failed (expired, invalid signature, etc.)
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid token',
      error: error.message 
    });
  }
};

// ===== MIDDLEWARE 2: Check User Role =====
export const authorize = (...roles) => {
  // This is a middleware factory - it returns a middleware function
  // Usage: authorize('teacher') or authorize('student', 'teacher')
  
  return (req, res, next) => {
    // Check if user's role is in allowed roles
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: `Role '${req.user.role}' is not authorized to access this route` 
      });
    }
    next();
  };
};

// ===== USAGE IN ROUTES =====
// router.post('/create-batch', protect, authorize('teacher'), createBatch);
//
// Flow:
// 1. protect: Verifies token, sets req.user
// 2. authorize('teacher'): Checks if req.user.role === 'teacher'
// 3. createBatch: Controller executes if both checks pass
```

### JWT Token Structure:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMzQ1Njc4OTAiLCJyb2xlIjoic3R1ZGVudCJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c

HEADER         . PAYLOAD                                  . SIGNATURE
(Algorithm)      (User data)                               (Verification)

Decoded Payload:
{
  "id": "507f1f77bcf86cd799439011",
  "role": "student",
  "iat": 1640995200,  // Issued at timestamp
  "exp": 1641081600   // Expiry timestamp (if set)
}
```

---

## File 4: controllers/authController.js

```javascript
import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// ===== REGISTER NEW USER =====
export const register = async (req, res) => {
  try {
    // 1. Extract data from request body
    const { name, email, password, role } = req.body;

    // 2. Validate input (basic check)
    if (!name || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide all fields' 
      });
    }

    // 3. Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email already registered' 
      });
    }

    // 4. Hash password
    const salt = await bcrypt.genSalt(10);
    // Salt = random string added to password before hashing
    // Example: password "hello123" + salt "randomXYZ" → hash
    
    const hashedPassword = await bcrypt.hash(password, salt);
    // Original: "hello123"
    // Hashed: "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"

    // 5. Create new user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,  // NEVER store plain password!
      role: role || 'student'  // Default to student if not specified
    });

    // 6. Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },  // Payload (data to store in token)
      process.env.JWT_SECRET,  // Secret key (from .env)
      { expiresIn: '7d' }  // Token valid for 7 days
    );

    // 7. Send token in HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,  // Cannot be accessed by JavaScript (prevents XSS)
      secure: process.env.NODE_ENV === 'production',  // HTTPS only in production
      sameSite: 'strict',  // CSRF protection
      maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days in milliseconds
    });

    // 8. Send response (exclude password)
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message 
    });
  }
};

// ===== LOGIN USER =====
export const login = async (req, res) => {
  try {
    // 1. Get credentials from request
    const { email, password } = req.body;

    // 2. Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide email and password' 
      });
    }

    // 3. Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
      // Note: Don't say "Email not found" - security best practice
      // Attackers shouldn't know if email exists or not
    }

    // 4. Compare passwords
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    // bcrypt.compare("hello123", hashedPassword) → true/false
    
    if (!isPasswordCorrect) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // 5. Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 6. Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    // 7. Send response
    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message 
    });
  }
};

// ===== LOGOUT USER =====
export const logout = (req, res) => {
  // Clear the token cookie
  res.clearCookie('token');
  res.status(200).json({ 
    success: true, 
    message: 'Logged out successfully' 
  });
};

// ===== GET CURRENT USER =====
export const getMe = async (req, res) => {
  try {
    // req.user is already set by 'protect' middleware
    res.status(200).json({
      success: true,
      user: req.user
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};
```

### Password Hashing Visualization:
```
User registers with password: "myPassword123"

Step 1: Generate Salt
├─> Salt: "$2a$10$N9qo8uLOickgx2ZMRZoMye"

Step 2: Hash Password + Salt
├─> Input: "myPassword123" + "$2a$10$N9qo8uLOickgx2ZMRZoMye"
└─> Hashed: "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"

Stored in Database: "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"

When user logs in with "myPassword123":
bcrypt.compare("myPassword123", storedHash) → true ✅

If user tries "wrongPassword":
bcrypt.compare("wrongPassword", storedHash) → false ❌
```

---

## File 5: controllers/studentController.js (Selected Functions)

### Function: Join Batch
```javascript
export const joinBatch = async (req, res) => {
  try {
    // 1. Get batch code from request and student ID from auth middleware
    const { batchCode } = req.body;
    const studentId = req.user.id;  // From 'protect' middleware

    // 2. Validate batch code
    if (!batchCode) {
      return res.status(400).json({ 
        success: false, 
        message: 'Batch code is required' 
      });
    }

    // 3. Find batch by name (batch code)
    const batch = await Batch.findOne({ name: batchCode });
    if (!batch) {
      return res.status(404).json({ 
        success: false, 
        message: 'Batch not found' 
      });
    }

    // 4. Check if student already in batch
    if (batch.students.includes(studentId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Already joined this batch' 
      });
    }

    // 5. Add student to batch's students array
    batch.students.push(studentId);
    await batch.save();

    // 6. Add batch to student's batches array
    const student = await User.findById(studentId);
    student.batches.push(batch._id);
    await student.save();

    // 7. Send response
    res.status(200).json({
      success: true,
      message: 'Successfully joined batch',
      batch: {
        id: batch._id,
        name: batch.name
      }
    });

  } catch (error) {
    console.error('Join batch error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message 
    });
  }
};
```

### Function: Submit Quiz
```javascript
export const submitQuiz = async (req, res) => {
  try {
    // 1. Get data from request
    const quizId = req.params.quizId;
    const studentId = req.user.id;
    const { answers, timeSpent } = req.body;
    // answers = [{ questionIndex: 0, selectedOption: 2 }, ...]

    // 2. Find the quiz
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ 
        success: false, 
        message: 'Quiz not found' 
      });
    }

    // 3. Check deadline
    if (quiz.deadline && new Date() > new Date(quiz.deadline)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Quiz deadline has passed' 
      });
    }

    // 4. Check if already submitted
    const existingResult = await Result.findOne({ 
      quiz: quizId, 
      student: studentId 
    });
    if (existingResult) {
      return res.status(400).json({ 
        success: false, 
        message: 'Quiz already submitted' 
      });
    }

    // 5. Calculate score
    let correctAnswers = 0;
    
    answers.forEach((answer) => {
      // Get the question from quiz
      const question = quiz.questions[answer.questionIndex];
      
      // Check if selected option matches correct answer
      if (question && question.correctAnswer === answer.selectedOption) {
        correctAnswers++;
      }
    });

    // Calculate percentage score
    const totalQuestions = quiz.questions.length;
    const score = (correctAnswers / totalQuestions) * 100;

    // 6. Create result document
    const result = await Result.create({
      quiz: quizId,
      student: studentId,
      score: score,
      correctAnswers: correctAnswers,
      timeSpent: timeSpent,
      answers: answers
    });

    // 7. Update quiz's average score
    // Get all results for this quiz
    const allResults = await Result.find({ quiz: quizId });
    const avgScore = allResults.reduce((sum, r) => sum + r.score, 0) / allResults.length;
    
    quiz.avgScore = avgScore;
    await quiz.save();

    // 8. Send response
    res.status(201).json({
      success: true,
      message: 'Quiz submitted successfully',
      result: {
        score: score,
        correctAnswers: correctAnswers,
        totalQuestions: totalQuestions,
        percentage: score.toFixed(2) + '%'
      }
    });

  } catch (error) {
    console.error('Submit quiz error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message 
    });
  }
};
```

### Score Calculation Example:
```
Quiz has 5 questions:
[
  { question: "Q1", correctAnswer: 0 },
  { question: "Q2", correctAnswer: 2 },
  { question: "Q3", correctAnswer: 1 },
  { question: "Q4", correctAnswer: 3 },
  { question: "Q5", correctAnswer: 0 }
]

Student submits answers:
[
  { questionIndex: 0, selectedOption: 0 },  ✅ Correct
  { questionIndex: 1, selectedOption: 1 },  ❌ Wrong
  { questionIndex: 2, selectedOption: 1 },  ✅ Correct
  { questionIndex: 3, selectedOption: 3 },  ✅ Correct
  { questionIndex: 4, selectedOption: 2 }   ❌ Wrong
]

Calculation:
correctAnswers = 3
totalQuestions = 5
score = (3 / 5) * 100 = 60%
```

---

## File 6: routes/studentRoutes.js

```javascript
import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  joinBatch,
  getActiveQuizzes,
  getQuizById,
  submitQuiz,
  getMyResults,
  askDoubt
} from '../controllers/studentController.js';

const router = express.Router();

// All routes here require authentication
// 'protect' middleware verifies JWT token
// 'authorize('student')' ensures only students can access

// POST /api/student/join-batch
router.post('/join-batch', 
  protect,                    // Verify token
  authorize('student'),       // Check role = student
  joinBatch                   // Controller function
);

// GET /api/student/active-quizzes
router.get('/active-quizzes', protect, authorize('student'), getActiveQuizzes);

// GET /api/student/quiz/:quizId
router.get('/quiz/:quizId', protect, authorize('student'), getQuizById);

// POST /api/student/submit-quiz/:quizId
router.post('/submit-quiz/:quizId', protect, authorize('student'), submitQuiz);

// GET /api/student/my-results
router.get('/my-results', protect, authorize('student'), getMyResults);

// POST /api/student/ask-doubt
router.post('/ask-doubt', protect, authorize('student'), askDoubt);

export default router;
```

---

## Understanding Async/Await

### Problem Without Async/Await (Callback Hell):
```javascript
// OLD WAY (Callback hell)
User.findOne({ email }, (err, user) => {
  if (err) return res.status(500).json({ error: err });
  
  bcrypt.compare(password, user.password, (err, isMatch) => {
    if (err) return res.status(500).json({ error: err });
    
    if (isMatch) {
      jwt.sign({ id: user._id }, secret, (err, token) => {
        if (err) return res.status(500).json({ error: err });
        
        res.json({ token });
      });
    }
  });
});
```

### Solution With Async/Await (Clean):
```javascript
// NEW WAY (Async/await)
try {
  const user = await User.findOne({ email });
  const isMatch = await bcrypt.compare(password, user.password);
  
  if (isMatch) {
    const token = await jwt.sign({ id: user._id }, secret);
    res.json({ token });
  }
} catch (error) {
  res.status(500).json({ error: error.message });
}
```

---

## Common MongoDB Queries Explained

### 1. Find with Conditions
```javascript
// Find active quizzes for student's batches
const quizzes = await Quiz.find({
  batch: { $in: batchIds },        // batch ID is in this array
  deadline: { $gte: new Date() }   // deadline is greater than or equal to now
});

// Operators:
// $in: value in array
// $gte: greater than or equal
// $lte: less than or equal
// $gt: greater than
// $lt: less than
// $ne: not equal
```

### 2. Population (Joins)
```javascript
// Without populate
const batch = await Batch.findById(batchId);
console.log(batch.teacher);
// Output: ObjectId("507f1f77bcf86cd799439011")

// With populate
const batch = await Batch.findById(batchId).populate('teacher', 'name email');
console.log(batch.teacher);
// Output: { _id: "507f...", name: "John", email: "john@test.com" }
```

### 3. Sorting and Limiting
```javascript
// Get top 10 scorers
const topScorers = await Result.find({ quiz: quizId })
  .populate('student', 'name')
  .sort({ score: -1 })    // Sort descending (-1)
  .limit(10);             // Only first 10 results
```

---

This walkthrough covers the most important files. Use this as a reference while reading the actual code! 🎯