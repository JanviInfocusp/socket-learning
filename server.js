const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const Y = require('yjs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Store YJS document for code editor
const yDoc = new Y.Doc();
const yText = yDoc.getText('codemirror');
let currentLanguage = 'javascript';

// Initialize with some sample code to make it obvious the editor works
const sampleCode = `// Welcome to the collaborative code editor!
// Try typing something and see it sync across clients.
function greet(name) {
  return \`Hello, \${name}!\`;
}

console.log(greet("World"));`;

// Only insert sample code if the document is empty
if (yText.toString() === '') {
  yText.insert(0, sampleCode);
}

// Track number of connected users
let connectedUsers = 0;

io.on('connection', (socket) => {
  // Increment user count and broadcast to all clients
  connectedUsers++;
  console.log('A user connected:', socket.id, '| Total users:', connectedUsers);

  // Important: Broadcast the updated count to ALL clients (including the one that just connected)
  io.emit('editor-user-count', connectedUsers);
  
  // Send current code language
  socket.emit('code-language-init', currentLanguage);
  
  // Handle YJS document updates for code editor
  socket.on('ydoc-update', (update) => {
    try {
      const uint8Array = new Uint8Array(update);
      Y.applyUpdate(yDoc, uint8Array);
      
      // Broadcast to all other clients
      socket.broadcast.emit('ydoc-update', update);
    } catch (error) {
      console.error('Error applying YDoc update:', error);
    }
  });
  
  // Fallback sync mechanism - simple content exchange
  socket.on('editor-content-change', (data) => {
    socket.broadcast.emit('editor-content-update', data);
  });
  
  // For fallback sync - provide initial content when requested
  socket.on('get-initial-content', (callback) => {
    try {
      // Return the content from the YDoc
      callback(yText.toString());
    } catch (error) {
      console.error('Error getting initial content:', error);
      callback(sampleCode); // Fall back to sample code
    }
  });
  
  // Send current YJS document state when requested
  socket.on('get-ydoc-state', (callback) => {
    try {
      const encodedState = Y.encodeStateAsUpdate(yDoc);
      callback(Array.from(encodedState));
    } catch (error) {
      console.error('Error encoding YDoc state:', error);
      callback(null);
    }
  });
  
  // Handle code language change
  socket.on('code-language-change', (language) => {
    currentLanguage = language;
    socket.broadcast.emit('code-language-change', language);
  });
  
  // Handle code execution request
  socket.on('run-code', async (data) => {
    try {
      let result = '';
      const { code, language } = data;
      
      // Very simple code execution - in production you'd want sandboxing
      if (language === 'javascript') {
        try {
          // Capture console.log output
          const originalLog = console.log;
          const logs = [];
          console.log = (...args) => {
            logs.push(args.join(' '));
            originalLog(...args);
          };
          
          // Execute the code with a timeout
          const executionTimeout = setTimeout(() => {
            throw new Error('Execution timed out (max 5 seconds)');
          }, 5000);
          
          // Use eval for simple demonstration purposes
          // WARNING: In production, use a proper sandboxed environment!
          eval(code);
          
          clearTimeout(executionTimeout);
          console.log = originalLog;
          
          result = logs.join('\n');
        } catch (err) {
          result = `Error: ${err.message}`;
        }
      } else {
        result = `Running code in ${language} is not supported yet.\nTry JavaScript for now.`;
      }
      
      // Send result back to the client
      socket.emit('code-result', result);
    } catch (error) {
      socket.emit('code-result', `Server Error: ${error.message}`);
    }
  });

  socket.on('disconnect', () => {
    // Decrement user count and broadcast to all clients
    connectedUsers--;
    
    console.log('User disconnected:', socket.id, '| Total users:', connectedUsers);
    
    // Broadcast updated count to all remaining clients
    io.emit('editor-user-count', connectedUsers);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} to use the collaborative editor`);
});
