const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Store document state
const documentState = [];

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Send initial document state when requested
  socket.on('request-document', (callback) => {
    callback(documentState);
  });

  // Handle batch operations
  socket.on('batch-operation', (operations) => {
    operations.forEach(op => {
      if (op.type === 'insert') {
        // Insert at correct position in documentState
        let index = 0;
        while (index < documentState.length && 
               comparePos(documentState[index].pos, op.char.pos)) {
          index++;
        }
        documentState.splice(index, 0, op.char);
      } else if (op.type === 'delete') {
        // Find and remove character from documentState
        const index = documentState.findIndex(char => 
          char.siteId === op.char.siteId && 
          char.clock === op.char.clock
        );
        if (index !== -1) {
          documentState.splice(index, 1);
        }
      }
    });

    // Broadcast to other clients
    socket.broadcast.emit('batch-operation', operations);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Helper function to compare positions
function comparePos(pos1, pos2) {
  for (let i = 0; i < Math.min(pos1.length, pos2.length); i++) {
    if (pos1[i] < pos2[i]) return true;
    if (pos1[i] > pos2[i]) return false;
  }
  return pos1.length < pos2.length;
}

const PORT = process.env.PORT || 3031;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} to use the collaborative editor`);
});
