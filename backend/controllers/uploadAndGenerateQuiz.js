import multer from 'multer';
import Quiz from '../models/Quiz.js';

// Set up multer storage (optional, since we’re not saving the file)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Middleware to export and use in the router
export const uploadMiddleware = upload.single('file');

// Generate hardcoded quiz
export const uploadAndGenerateQuiz = async (req, res) => {
  const { batchId } = req.body;

  if (!batchId) {
    return res.status(400).json({ error: 'Batch ID is required' });
  }

  const hardcodedQuiz = {
    questions: [
      {
        question: 'What is the capital of India?',
        options: ['Mumbai', 'Delhi', 'Chennai', 'Kolkata'],
        correct: 1
      },
      {
        question: 'What is 2 * 6?',
        options: ['10', '11', '12', '14'],
        correct: 2
      },
      {
        question: 'Which language is used for web apps?',
        options: ['Python', 'Java', 'JavaScript', 'C++'],
        correct: 2
      }
    ]
  };

  return res.status(200).json({ quiz: hardcodedQuiz });
};

// Publish to DB
export const publishQuiz = async (req, res) => {
  try {
    const { quizId, batchId } = req.body;

    if (!quizId || !batchId) {
      return res.status(400).json({ error: 'quizId and batchId are required' });
    }

    // 1️⃣ Find quiz ONLY by quizId + teacher
    const quiz = await Quiz.findOne({
      _id: quizId,
      createdBy: req.user.userId
    });

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    // 2️⃣ Validate batch separately
    if (quiz.batch.toString() !== batchId) {
      return res.status(400).json({ error: 'Batch mismatch' });
    }

    // 3️⃣ Publish quiz (if you want status)
    // quiz.isPublished = true;

    await quiz.save();

    res.status(200).json({ message: 'Quiz published successfully' });

  } catch (err) {
    console.error('Publish quiz error:', err.message);
    res.status(500).json({ error: 'Failed to publish quiz' });
  }
};
