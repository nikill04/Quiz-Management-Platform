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



/* 
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
// Now user.batches will contain full Batch objects, not just IDs              */






// import mongoose from 'mongoose';

// const userSchema = new mongoose.Schema({
//   name: String,
//   email: { type: String, unique: true },
//   password: String,
//   role: { type: String, enum: ['student', 'teacher'], default: 'student' },
//   batches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Batch' }] 
// });

// // For faster login lookup
// userSchema.index({ email: 1 });

// const User = mongoose.model('User', userSchema);
// export default User;
