const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

/**
 * DocumentManager - Handles the shared document state
 * Maintains the document content and processes operations
 */
class DocumentManager {
  constructor() {
    this.content = [];  // Array of CRDT characters
  }

  // Process a batch of operations
  processBatch(operations) {
    operations.forEach(op => {
      if (op.type === 'insert') {
        this.insertChar(op.char);
      } else if (op.type === 'delete') {
        this.deleteChar(op.char);
      }
    });
  }

  // Insert a character at the correct position
  insertChar(char) {
    let index = 0;
    while (index < this.content.length && 
           this.comparePositions(this.content[index].position, char.position)) {
      index++;
    }
    this.content.splice(index, 0, char);
  }

  // Delete a character
  deleteChar(char) {
    const index = this.content.findIndex(c => 
      c.siteId === char.siteId && c.clock === char.clock
    );
    if (index !== -1) {
      this.content.splice(index, 1);
    }
  }

  // Compare position identifiers
  comparePositions(pos1, pos2) {
    for (let i = 0; i < Math.min(pos1.length, pos2.length); i++) {
      if (pos1[i] < pos2[i]) return true;
      if (pos1[i] > pos2[i]) return false;
    }
    return pos1.length < pos2.length;
  }
}

// Create document manager
const docManager = new DocumentManager();

// Handle socket connections
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Send current document state
  socket.on('request-document', (callback) => {
    callback(docManager.content);
  });

  // Process and broadcast operations
  socket.on('batch-operation', (operations) => {
    docManager.processBatch(operations);
    socket.broadcast.emit('batch-operation', operations);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Start server with automatic port selection
function startServer(port) {
  server.listen(port)
    .on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${port} is busy, trying ${port + 1}`);
        startServer(port + 1);
      }
    })
    .on('listening', () => {
      const actualPort = server.address().port;
      console.log(`Server running on http://localhost:${actualPort}`);
    });
}

startServer(3000);
