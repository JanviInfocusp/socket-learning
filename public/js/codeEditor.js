/**
 * CodeEditor - Collaborative code editor using CodeMirror and CRDT
 */
class CodeEditor {
  constructor(socket, container, outputContainer) {
    this.socket = socket;
    this.container = container;
    this.outputContainer = outputContainer;
    this.editor = null;
    
    // Initialize CRDT with random site ID
    this.siteId = Math.floor(Math.random() * 1000000);
    this.crdt = new CRDT(this.siteId);
    
    this.currentLanguage = 'javascript';
    this.init();

    // Request initial document state
    this.socket.emit('request-document', (documentState) => {
      if (documentState && documentState.length > 0) {
        documentState.forEach(char => {
          this.crdt.remoteInsert(char);
        });
        this.editor.setValue(this.crdt.toString());
      }
    });
  }

  init() {
    if (!this.container) {
      console.error("CodeEditor container element not found!");
      return;
    }

    try {
      // Initialize CodeMirror with enhanced options for VS Code-like appearance
      this.editor = CodeMirror(this.container, {
        lineNumbers: true,
        theme: 'monokai',
        mode: this.currentLanguage,
        indentUnit: 2,
        tabSize: 2,
        lineWrapping: true,
        autofocus: true,
        readOnly: false, // Ensure editor is editable
        matchBrackets: true,
        autoCloseBrackets: true,
        styleActiveLine: true,
        inputStyle: 'contenteditable', // Try this for better mobile support
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

      // Buffer for batching changes
      let changeBuffer = [];
      let bufferTimeout = null;

      // Handle local changes with buffering
      this.editor.on('change', (cm, change) => {
        if (change.origin === 'remote') return;
        
        const startPos = this.editor.indexFromPos(change.from);
        
        if (change.origin === '+delete' || change.origin === 'cut') {
          for (let i = 0; i < change.removed[0].length; i++) {
            const char = this.crdt.delete(startPos);
            changeBuffer.push({ type: 'delete', char });
          }
        } else {
          const chars = change.text.join('\n').split('');
          chars.forEach((char, i) => {
            const crdtChar = this.crdt.localInsert(char, startPos + i);
            changeBuffer.push({ type: 'insert', char: crdtChar });
          });
        }

        // Batch send changes
        clearTimeout(bufferTimeout);
        bufferTimeout = setTimeout(() => {
          if (changeBuffer.length > 0) {
            this.socket.emit('batch-operation', changeBuffer);
            changeBuffer = [];
          }
        }, 50);
      });

      // Handle remote operations
      this.socket.on('batch-operation', (operations) => {
        operations.forEach(op => {
          if (op.type === 'insert') {
            const index = this.crdt.remoteInsert(op.char);
            const pos = this.editor.posFromIndex(index);
            this.editor.replaceRange(op.char.value, pos, pos, 'remote');
          } else if (op.type === 'delete') {
            const index = this.crdt.findInsertIndex(op.char);
            const pos = this.editor.posFromIndex(index);
            const posEnd = this.editor.posFromIndex(index + 1);
            this.editor.replaceRange('', pos, posEnd, 'remote');
          }
        });
      });

      // Language change handler
      const langSelect = document.getElementById('language-select');
      if (langSelect) {
        langSelect.addEventListener('change', (e) => this.changeLanguage(e.target.value));
      }

      // Run code handler
      const runButton = document.getElementById('run-code');
      if (runButton) {
        runButton.addEventListener('click', () => this.runCode());
      }

    } catch (error) {
      console.error("Error initializing CodeMirror:", error);
    }
  }

  /**
   * Change the editor language mode
   */
  changeLanguage(language) {
    this.currentLanguage = language;
    this.editor.setOption('mode', language);
  }

  /**
   * Run the current code in the editor
   */
  runCode() {
    const code = this.editor.getValue();
    
    // Send code to be executed on the server
    this.socket.emit('run-code', {
      code: code,
      language: this.currentLanguage
    });
    
    // Clear previous output
    this.outputContainer.textContent = 'Running code...';
  }

  /**
   * Display execution output
   */
  showOutput(output) {
    this.outputContainer.textContent = output;
  }

  /**
   * Apply a language change received from another user
   */
  applyLanguageChange(language) {
    this.currentLanguage = language;
    this.editor.setOption('mode', language);
    
    // Update the language selector
    const langSelect = document.getElementById('language-select');
    if (langSelect) {
      langSelect.value = language;
    }
  }
}
