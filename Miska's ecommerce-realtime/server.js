require('dotenv').config();
const path = require('path');
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const connectDB = require('./config/db');
const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

// Middleware
app.use(morgan('dev'));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api', apiRoutes);
app.use('/admin', adminRoutes);

// Socket.IO
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

// Make io available in routes
app.set('io', io);

const PORT = process.env.PORT || 3000;

connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });

  