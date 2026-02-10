# 🎯 Quick Reference Guide - Quiz Management Platform Backend

## 📊 Database Schema Relationships

```
┌─────────────┐
│    USER     │
├─────────────┤
│ _id         │───┐
│ name        │   │
│ email       │   │
│ password    │   │
│ role        │   │  (student/teacher)
│ batches[]   │───┼──────────┐
└─────────────┘   │          │
                  │          │
                  │   ┌──────▼──────┐
                  │   │    BATCH    │
                  │   ├─────────────┤
                  │   │ _id         │
                  │   │ name        │
                  ├───│ teacher     │ (ref: User)
                  │   │ students[]  │ (ref: User)
                  │   └─────────────┘
                  │          │
                  │          │
                  │   ┌──────▼──────┐
                  │   │    QUIZ     │
                  │   ├─────────────┤
                  │   │ _id         │
                  │   │ title       │
                  ├───│ createdBy   │ (ref: User - teacher)
                  │   │ batch       │ (ref: Batch)
                  │   │ questions[] │
                  │   │ deadline    │
                  │   │ duration    │
                  │   └─────────────┘
                  │          │
                  │          │
                  │   ┌──────▼──────┐
                  │   │   RESULT    │
                  │   ├─────────────┤
                  │   │ _id         │
                  │   │ quiz        │ (ref: Quiz)
                  └───│ student     │ (ref: User)
                      │ score       │
                      │ answers[]   │
                      │ timeSpent   │
                      └─────────────┘

                  ┌──────────────┐
                  │    DOUBT     │
                  ├──────────────┤
                  │ _id          │
                  │ student      │ (ref: User)
                  │ question     │
                  │ answer       │
                  │ askedAt      │
                  └──────────────┘
```

---

## 🔄 Request Flow Diagram

```
┌──────────┐      ┌──────────┐      ┌────────────┐      ┌────────────┐      ┌──────────┐
│  CLIENT  │─────>│  ROUTES  │─────>│ MIDDLEWARE │─────>│ CONTROLLER │─────>│  MODEL   │
│(Frontend)│      │(authRoutes)     │  (auth.js) │      │(authController)   │(User.js) │
└──────────┘      └──────────┘      └────────────┘      └────────────┘      └──────────┘
     ▲                                                           │                   │
     │                                                           │                   │
     │                                                           ▼                   ▼
     │                                                    ┌────────────┐      ┌──────────┐
     └──────────────────────────────────────────────────  │  RESPONSE  │◄─────│ DATABASE │
                                                          └────────────┘      │(MongoDB) │
                                                                              └──────────┘
```

**Example Flow: Student Joins Batch**
```
1. POST /api/student/join-batch { batchCode: "BATCH101" }
   └─> studentRoutes.js
       └─> protect middleware (verify JWT)
           └─> authorize('student') middleware
               └─> studentController.joinBatch()
                   └─> Batch.findOne({ name: "BATCH101" })
                       └─> batch.students.push(studentId)
                           └─> batch.save()
                               └─> Response: { success: true, batch }
```

---

## 🔐 Authentication Flow

```
REGISTRATION:
┌──────────────────────────────────────────────────────────────┐
│ 1. POST /api/auth/register                                   │
│    Body: { name, email, password, role }                     │
│                                                              │
│ 2. Hash Password                                             │
│    bcrypt.hash(password, 10) → hashedPassword                │
│                                                              │
│ 3. Create User                                               │
│    new User({ name, email, password: hashedPassword })       │
│                                                              │
│ 4. Generate JWT                                              │
│    jwt.sign({ id: user._id, role }, JWT_SECRET)              │
│                                                              │
│ 5. Set Cookie                                                │
│    res.cookie('token', token, { httpOnly: true })            │
│                                                              │
│ 6. Send Response                                             │
│    { success: true, user: { id, name, email, role } }        │
└──────────────────────────────────────────────────────────────┘

LOGIN:
┌──────────────────────────────────────────────────────────────┐
│ 1. POST /api/auth/login                                      │
│    Body: { email, password }                                 │
│                                                              │
│ 2. Find User                                                 │
│    User.findOne({ email })                                   │
│                                                              │
│ 3. Compare Password                                          │
│    bcrypt.compare(password, user.password)                   │
│                                                              │
│ 4. Generate JWT                                              │
│    jwt.sign({ id: user._id, role }, JWT_SECRET)              │
│                                                              │
│ 5. Set Cookie & Respond                                      │
│    res.cookie('token', token).json({ success: true, user })  │
└──────────────────────────────────────────────────────────────┘

ACCESSING PROTECTED ROUTES:
┌──────────────────────────────────────────────────────────────┐
│ 1. Client sends request with cookie                          │
│    Cookie: token=eyJhbGc...                                  │
│                                                              │
│ 2. Auth Middleware (protect)                                 │
│    - Extract token from req.cookies.token                    │
│    - Verify: jwt.verify(token, JWT_SECRET)                   │
│    - Decode: { id: "userId", role: "student" }               │
│    - Find user: User.findById(decoded.id)                    │
│    - Attach: req.user = user                                 │
│    - Continue: next()                                        │
│                                                              │
│ 3. Authorization Middleware (authorize)                      │
│    - Check: req.user.role === 'teacher'                      │
│    - If match: next()                                        │
│    - If not: 403 Forbidden                                   │
│                                                              │
│ 4. Controller executes                                       │
│    - Access user: req.user.id, req.user.role                 │
└──────────────────────────────────────────────────────────────┘
```

---

## 📝 Code Snippets & Examples

### Example 1: Creating a New Route & Controller

**routes/studentRoutes.js**
```javascript
import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { getMyProfile } from '../controllers/studentController.js';

const router = express.Router();

// GET /api/student/profile
router.get('/profile', protect, authorize('student'), getMyProfile);

export default router;
```

**controllers/studentController.js**
```javascript
export const getMyProfile = async (req, res) => {
  try {
    // req.user is already available from 'protect' middleware
    const student = await User.findById(req.user.id)
      .populate('batches', 'name teacher')  // Get batch details
      .select('-password');  // Exclude password field

    if (!student) {
      return res.status(404).json({ 
        success: false, 
        message: 'Student not found' 
      });
    }

    res.status(200).json({
      success: true,
      student
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message 
    });
  }
};
```

---

### Example 2: MongoDB Queries (Common Patterns)

```javascript
// ===== FIND ONE =====
const user = await User.findOne({ email: 'test@example.com' });

// ===== FIND BY ID =====
const quiz = await Quiz.findById(quizId);

// ===== FIND ALL WITH CONDITIONS =====
const activeQuizzes = await Quiz.find({
  batch: { $in: batchIds },           // Quiz belongs to any of these batches
  deadline: { $gte: new Date() }      // Deadline is in the future
});

// ===== FIND WITH POPULATION =====
const batch = await Batch.findById(batchId)
  .populate('teacher', 'name email')      // Include teacher's name & email
  .populate('students', 'name email');    // Include students' names & emails

// ===== CREATE =====
const newQuiz = new Quiz({
  title: 'JavaScript Basics',
  batch: batchId,
  createdBy: teacherId,
  questions: [...],
  deadline: new Date('2024-12-31')
});
await newQuiz.save();

// Or alternative:
const newQuiz = await Quiz.create({
  title: 'JavaScript Basics',
  batch: batchId,
  // ...
});

// ===== UPDATE =====
await Quiz.findByIdAndUpdate(
  quizId,
  { title: 'Updated Title' },
  { new: true }  // Return updated document
);

// ===== DELETE =====
await Quiz.findByIdAndDelete(quizId);

// ===== AGGREGATE (Complex Queries) =====
const stats = await Result.aggregate([
  { $match: { quiz: quizId } },
  { $group: {
      _id: null,
      avgScore: { $avg: '$score' },
      maxScore: { $max: '$score' },
      minScore: { $min: '$score' },
      totalStudents: { $sum: 1 }
    }
  }
]);

// ===== SORT & LIMIT =====
const topScorers = await Result.find({ quiz: quizId })
  .populate('student', 'name')
  .sort({ score: -1 })  // -1 = descending, 1 = ascending
  .limit(10);

// ===== COUNT =====
const quizCount = await Quiz.countDocuments({ createdBy: teacherId });

// ===== EXISTS =====
const alreadySubmitted = await Result.exists({ 
  quiz: quizId, 
  student: studentId 
});
```

---

### Example 3: Error Handling Patterns

```javascript
// ===== TRY-CATCH WRAPPER =====
export const someController = async (req, res) => {
  try {
    // Your logic here
    const result = await SomeModel.find();
    res.json({ success: true, result });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message 
    });
  }
};

// ===== VALIDATION =====
export const createQuiz = async (req, res) => {
  try {
    const { title, batchId, questions } = req.body;
    
    // Validate input
    if (!title || !batchId || !questions || questions.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }
    
    // Check if batch exists
    const batch = await Batch.findById(batchId);
    if (!batch) {
      return res.status(404).json({ 
        success: false, 
        message: 'Batch not found' 
      });
    }
    
    // Create quiz
    const quiz = await Quiz.create({ title, batch: batchId, questions });
    res.status(201).json({ success: true, quiz });
    
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===== CUSTOM ERROR CLASS =====
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

// Usage:
if (!user) {
  throw new AppError('User not found', 404);
}
```

---

### Example 4: Middleware Examples

```javascript
// ===== LOGGING MIDDLEWARE =====
const logger = (req, res, next) => {
  console.log(`${req.method} ${req.url} - ${new Date().toISOString()}`);
  next();
};

// ===== VALIDATION MIDDLEWARE (using express-validator) =====
import { body, validationResult } from 'express-validator';

export const validateRegistration = [
  body('email').isEmail().withMessage('Invalid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be 6+ chars'),
  body('name').notEmpty().withMessage('Name is required'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }
    next();
  }
];

// Usage in route:
router.post('/register', validateRegistration, register);

// ===== RATE LIMITING =====
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many login attempts, please try again later'
});

router.post('/login', loginLimiter, login);
```

---

## 🧪 Testing with Postman

### Setup Environment Variables in Postman
```
BASE_URL: http://localhost:5000
TOKEN: (will be set after login)
```

### Test Sequence

**1. Register Teacher**
```
POST {{BASE_URL}}/api/auth/register
Body (JSON):
{
  "name": "John Teacher",
  "email": "teacher@test.com",
  "password": "password123",
  "role": "teacher"
}

Response: 
- Saves token in cookies automatically
```

**2. Login**
```
POST {{BASE_URL}}/api/auth/login
Body (JSON):
{
  "email": "teacher@test.com",
  "password": "password123"
}
```

**3. Create Batch (as Teacher)**
```
POST {{BASE_URL}}/api/teacher/create-batch
Headers: (cookie automatically sent)
Body (JSON):
{
  "name": "BATCH_CS_2024"
}

Response:
{
  "success": true,
  "batch": {
    "_id": "abc123...",
    "name": "BATCH_CS_2024",
    "teacher": "teacherId",
    "students": []
  }
}
```

**4. Create Quiz**
```
POST {{BASE_URL}}/api/teacher/create-quiz
Body (JSON):
{
  "title": "JavaScript Fundamentals",
  "batchId": "abc123...",
  "deadline": "2024-12-31",
  "duration": 30,
  "questions": [
    {
      "question": "What is JavaScript?",
      "options": ["Language", "Framework", "Library", "Database"],
      "correctAnswer": 0
    }
  ]
}
```

**5. Register Student**
```
POST {{BASE_URL}}/api/auth/register
Body (JSON):
{
  "name": "Alice Student",
  "email": "student@test.com",
  "password": "password123",
  "role": "student"
}
```

**6. Join Batch (as Student)**
```
POST {{BASE_URL}}/api/student/join-batch
Body (JSON):
{
  "batchCode": "BATCH_CS_2024"
}
```

**7. Get Active Quizzes**
```
GET {{BASE_URL}}/api/student/active-quizzes
```

**8. Submit Quiz**
```
POST {{BASE_URL}}/api/student/submit-quiz/:quizId
Body (JSON):
{
  "answers": [
    {
      "questionIndex": 0,
      "selectedOption": 0
    }
  ],
  "timeSpent": "00:15:30"
}
```

---

## 🔍 Debugging Tips

### Common Errors & Solutions

**Error: "JWT malformed"**
- **Cause**: Token is invalid or missing
- **Solution**: Login again to get new token

**Error: "Cast to ObjectId failed"**
- **Cause**: Invalid ID format
- **Solution**: Ensure ID is valid MongoDB ObjectId (24 hex chars)

**Error: "E11000 duplicate key error"**
- **Cause**: Trying to insert duplicate unique field
- **Solution**: Check for existing records before creating

**Error: "Cannot read property 'id' of undefined"**
- **Cause**: req.user is undefined (auth middleware issue)
- **Solution**: Ensure protect middleware is applied

**Error: "CORS error"**
- **Cause**: Frontend origin not allowed
- **Solution**: Add frontend URL to cors whitelist

### Debug Console Logs
```javascript
// Log request body
console.log('Request Body:', req.body);

// Log user from middleware
console.log('Authenticated User:', req.user);

// Log database query result
console.log('Found Quiz:', quiz);

// Log errors
console.error('Error details:', error);
```

---

## 📚 Key Concepts Summary

### MVC Architecture
- **Model**: Data structure (User, Quiz, etc.)
- **View**: Frontend (React) - not in backend
- **Controller**: Business logic (authController, etc.)

### REST API Principles
- **GET**: Retrieve data
- **POST**: Create new data
- **PUT/PATCH**: Update data
- **DELETE**: Remove data

### JWT Authentication
- **Purpose**: Stateless authentication
- **Structure**: Header.Payload.Signature
- **Storage**: HTTP-only cookies (secure)

### MongoDB Concepts
- **Collection**: Like a table (Users, Quizzes)
- **Document**: Like a row (single user, single quiz)
- **Schema**: Structure definition
- **Population**: Join operation (like SQL JOIN)

### Async/Await
```javascript
// Wrong (Promises hell)
User.findOne({ email })
  .then(user => {
    bcrypt.compare(password, user.password)
      .then(isMatch => {
        // ...
      });
  });

// Right (Async/Await)
const user = await User.findOne({ email });
const isMatch = await bcrypt.compare(password, user.password);
```

---

## 🎯 Practice Exercises

### Beginner Level
1. Add a new field `phone` to User model
2. Create a route to get all batches
3. Add validation for email format
4. Create a controller to get quiz by ID

### Intermediate Level
1. Implement "forgot password" feature
2. Add quiz categories (filter by category)
3. Create a route to get student's average score
4. Implement quiz draft (save without publishing)

### Advanced Level
1. Add role-based permissions (admin, teacher, student)
2. Implement real-time quiz timer (Socket.IO)
3. Add quiz question banks (reusable questions)
4. Create analytics dashboard API (graphs data)

---

## 🚀 Deployment Checklist

- [ ] Environment variables (.env) configured
- [ ] MongoDB Atlas connection string
- [ ] CORS origins updated
- [ ] Security headers added
- [ ] Error handling implemented
- [ ] API documentation complete
- [ ] Testing done (Postman collection)
- [ ] Rate limiting added
- [ ] Logging configured

---

**This is your quick reference guide. Keep it handy while coding!** 🎉