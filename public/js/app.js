document.addEventListener('DOMContentLoaded', function() {
  // Connect to Socket.IO
  const socket = io();
  
  // Code editor elements
  const codeEditorDiv = document.getElementById('code-editor');
  const codeOutput = document.getElementById('code-output');
  const editorConnectionStatus = document.getElementById('editor-connection-status');
  const editorUserCount = document.getElementById('editor-user-count');
  
  // Initialize Code Editor
  const codeEditor = new CodeEditor(socket, codeEditorDiv, codeOutput);
  
  // Socket.IO event handlers
  socket.on('connect', () => {
    editorConnectionStatus.className = 'online';
    editorConnectionStatus.textContent = 'Online';
    
    console.log("Connected to server");
    
    // When connection is established, refresh CodeMirror
    if (codeEditor && codeEditor.editor) {
      setTimeout(() => codeEditor.editor.refresh(), 100);
    }
  });
  
  socket.on('disconnect', () => {
    editorConnectionStatus.className = 'offline';
    editorConnectionStatus.textContent = 'Offline';
    console.log("Disconnected from server");
  });
  
  // Better handling of user count updates
  socket.on('editor-user-count', (count) => {
    console.log("User count updated:", count);
    editorUserCount.textContent = `Editors: ${count}`;
  });
  
  // Language change event
  socket.on('code-language-change', (language) => {
    if (codeEditor) {
      codeEditor.applyLanguageChange(language);
    }
  });
  
  socket.on('code-language-init', (language) => {
    if (codeEditor) {
      codeEditor.applyLanguageChange(language);
    }
  });
  
  // Code execution result
  socket.on('code-result', (result) => {
    if (codeEditor) {
      codeEditor.showOutput(result);
    }
  });
  
  // Handle window resize to make CodeMirror responsive
  window.addEventListener('resize', () => {
    if (codeEditor && codeEditor.editor) {
      setTimeout(() => codeEditor.editor.refresh(), 10);
    }
  });
});
