// backend/middleware/auth.js

import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; 
    req.userId = req.userId = decoded._id || decoded.id || decoded.userId;
    // contains userId, role, etc.
    // console.log('Token from cookie:', req.cookies.token);
    // console.log('User ID set to req.userId:', req.userId);

    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

export const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: 'Access denied: incorrect role' });
    }
    next();
  };
};





/* 
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
// 3. createBatch: Controller executes if both checks pass             */