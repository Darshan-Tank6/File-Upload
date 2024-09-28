const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const File = require('./models/file.model');
const User = require('./models/user.model');
const path = require('path');

const app = express();
const port = process.env.PORT || 3030;

// Middleware to parse JSON requests
app.use(express.json());

// MongoDB connection
mongoose.connect('mongodb://127.0.0.1:27017/new12345', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;

db.on('error', (error) => console.error('MongoDB connection error:', error));
db.once('open', () => console.log('Connected to MongoDB'));

// Multer configuration
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Middleware to verify JWT token
const authenticateJWT = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1]; // Extract token from the 'Bearer' token
  if (!token) {
    return res.status(401).send('Access denied. No token provided.');
  }

  try {
    const decoded = jwt.verify(token, 'your_jwt_secret');
    req.user = decoded;
    next();
  } catch (ex) {
    res.status(400).send('Invalid token.');
  }
};

// Route for user sign-up
app.post('/signup', async (req, res) => {
  try {
    const { username, password } = req.body;
    const existingUser = await User.findOne({ username });

    if (existingUser) {
      return res.status(400).send('Username already exists');
    }

    const user = new User({ username, password });
    await user.save();
    res.status(201).send('User registered successfully');
  } catch (error) {
    res.status(500).send('Error signing up user');
  }
});

// Route for user login
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(400).send('Invalid username or password');
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(400).send('Invalid username or password');
    }

    // Generate a JWT token
    const token = jwt.sign({ userId: user._id }, 'your_jwt_secret', { expiresIn: '1h' });
    res.status(200).json({ token });
  } catch (error) {
    res.status(500).send('Error logging in');
  }
});

// Route for uploading a PDF file (protected)
app.post('/upload', authenticateJWT, upload.single('pdf'), async (req, res) => {
  try {
    const { originalname, buffer, mimetype } = req.file;

    const file = new File({
      name: originalname,
      data: buffer,
      contentType: mimetype,
      uploadedBy: req.user.userId, // Associate file with the user
    });

    await file.save();
    res.status(201).send('File uploaded successfully.');
  } catch (error) {
    res.status(500).send('Error uploading the file.');
  }
});

// Route to display a list of uploaded files (protected)
app.get('/files', authenticateJWT, async (req, res) => {
  try {
    const files = await File.find();
    res.send(files);
  } catch (error) {
    res.status(500).send('Error retrieving files from the database.');
  }
});

// Route to view an individual file based on its ID (protected)
app.get('/files/:id', authenticateJWT, async (req, res) => {
  try {
    const file = await File.findById(req.params.id);

    if (!file) {
      return res.status(404).send('File not found');
    }

    res.contentType(file.contentType);
    res.send(file.data);
  } catch (error) {
    res.status(500).send('Error retrieving the file from the database.');
  }
});

// Route to download an individual file based on its ID (protected)
app.get('/files/:id/download', authenticateJWT, async (req, res) => {
  try {
    const file = await File.findById(req.params.id);

    if (!file) {
      return res.status(404).send('File not found');
    }

    res.set({
      'Content-Disposition': `attachment; filename="${file.name}"`,
      'Content-Type': file.contentType,
    });
    res.send(file.data);
  } catch (error) {
    res.status(500).send('Error downloading the file from the database.');
  }
});

// Route for deleting a file (protected)
app.delete('/files/:id', authenticateJWT, async (req, res) => {
  try {
    const file = await File.findByIdAndDelete(req.params.id);

    if (!file) {
      return res.status(404).send('File not found');
    }

    res.send('File deleted successfully.');
  } catch (error) {
    res.status(500).send('Error deleting the file.');
  }
});

// Serve the HTML file from the public folder
app.use(express.static(path.join(__dirname, 'public')));

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
