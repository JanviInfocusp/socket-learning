/**
 * CodeEditor - Collaborative code editor using CodeMirror and CRDT
 * Handles:
 * - Text editing and synchronization
 * - Multiple user collaboration
 * - Code execution
 */
class CodeEditor {
  constructor(socket, container, outputContainer) {
    // Core properties
    this.socket = socket;
    this.container = container;
    this.outputContainer = outputContainer;
    this.editor = null;
    
    // Initialize CRDT for collaborative editing
    this.siteId = Math.floor(Math.random() * 1000000);
    this.crdt = new CRDT(this.siteId);
    
    // Editor state
    this.currentLanguage = 'javascript';
    this.changeBuffer = [];
    this.bufferTimeout = null;
    
    this.init();
    this.requestInitialContent();
  }

  // Initialize the editor
  init() {
    this.setupCodeMirror();
    this.setupChangeHandlers();
    this.setupLanguageHandler();
    this.setupRunButton();
  }

  // Setup CodeMirror instance
  setupCodeMirror() {
    if (!this.container) {
      console.error("Editor container not found!");
      return;
    }

    this.editor = CodeMirror(this.container, {
      lineNumbers: true,
      theme: 'monokai',
      mode: this.currentLanguage,
      indentUnit: 2,
      tabSize: 2,
      lineWrapping: true,
      autofocus: true,
      readOnly: false,
      matchBrackets: true,
      autoCloseBrackets: true,
      styleActiveLine: true,
      inputStyle: 'contenteditable',
      extraKeys: {
        "Ctrl-Space": "autocomplete",
        "Tab": function(cm) {
          if (cm.somethingSelected()) {
            cm.indentSelection("add");
          } else {
            cm.replaceSelection("  ", "end");
          }
        }
      },
      indentWithTabs: false,
      electricChars: true,
      foldGutter: true,
      gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
      highlightSelectionMatches: {showToken: /\w/, annotateScrollbar: true}
    });
  }

  // Setup handlers for local and remote changes
  setupChangeHandlers() {
    // Handle local changes
    this.editor.on('change', (cm, change) => {
      if (change.origin === 'remote') return;
      this.handleLocalChange(change);
    });

    // Handle remote changes
    this.socket.on('batch-operation', (operations) => {
      this.handleRemoteOperations(operations);
    });
  }

  // Handle a local change
  handleLocalChange(change) {
    const startPos = this.editor.indexFromPos(change.from);
    
    if (this.isDeleteOperation(change.origin)) {
      this.handleLocalDelete(startPos, change.removed[0].length);
    } else {
      this.handleLocalInsert(startPos, change.text.join('\n'));
    }
    
    this.scheduleBufferSend();
  }

  // Handle local text insertion
  handleLocalInsert(startPos, text) {
    text.split('').forEach((char, i) => {
      const crdtChar = this.crdt.insertChar(char, startPos + i);
      this.changeBuffer.push({ type: 'insert', char: crdtChar });
    });
  }

  // Handle local text deletion
  handleLocalDelete(startPos, length) {
    for (let i = 0; i < length; i++) {
      const char = this.crdt.deleteChar(startPos);
      this.changeBuffer.push({ type: 'delete', char });
    }
  }

  // Schedule sending of buffered changes
  scheduleBufferSend() {
    clearTimeout(this.bufferTimeout);
    this.bufferTimeout = setTimeout(() => {
      if (this.changeBuffer.length > 0) {
        this.socket.emit('batch-operation', this.changeBuffer);
        this.changeBuffer = [];
      }
    }, 50);
  }

  // Request initial document content
  requestInitialContent() {
    this.socket.emit('request-document', (documentState) => {
      if (documentState && documentState.length > 0) {
        documentState.forEach(char => {
          this.crdt.insertRemoteChar(char);
        });
        this.editor.setValue(this.crdt.getText());
      }
    });
  }

  // Handle remote operations
  handleRemoteOperations(operations) {
    operations.forEach(op => {
      if (op.type === 'insert') {
        const index = this.crdt.insertRemoteChar(op.char);
        const pos = this.editor.posFromIndex(index);
        this.editor.replaceRange(op.char.value, pos, pos, 'remote');
      } else if (op.type === 'delete') {
        const index = this.crdt.findInsertIndex(op.char);
        const pos = this.editor.posFromIndex(index);
        const posEnd = this.editor.posFromIndex(index + 1);
        this.editor.replaceRange('', pos, posEnd, 'remote');
      }
    });
  }

  // Check if the operation is a delete
  isDeleteOperation(origin) {
    return origin === '+delete' || origin === 'cut';
  }

  // Setup language change handler
  setupLanguageHandler() {
    const langSelect = document.getElementById('language-select');
    if (langSelect) {
      langSelect.addEventListener('change', (e) => this.changeLanguage(e.target.value));
    }
  }

  // Change the editor language mode
  changeLanguage(language) {
    this.currentLanguage = language;
    this.editor.setOption('mode', language);
    
    const langSelect = document.getElementById('language-select');
    if (langSelect) {
      langSelect.value = language;
    }
  }

  // Setup run code button handler
  setupRunButton() {
    const runButton = document.getElementById('run-code');
    if (runButton) {
      runButton.addEventListener('click', () => this.runCode());
    }
  }

  // Run the current code in the editor
  runCode() {
    const code = this.editor.getValue();
    
    this.socket.emit('run-code', {
      code: code,
      language: this.currentLanguage
    });
    
    this.outputContainer.textContent = 'Running code...';
  }

  // Display execution output
  showOutput(output) {
    this.outputContainer.textContent = output;
  }
}
