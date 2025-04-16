/**
 * CodeEditor - Collaborative code editor using CodeMirror and Y.js
 */
class CodeEditor {
  constructor(socket, container, outputContainer) {
    this.socket = socket;
    this.container = container;
    this.outputContainer = outputContainer;
    this.editor = null;
    
    // Make sure Y is defined before using it
    if (typeof Y === 'undefined') {
      console.error('Y is not defined! Check if the YJS library is properly loaded.');
      // Create a fallback that doesn't rely on Y
      this.initWithoutYJS();
    } else {
      this.yDoc = new Y.Doc();
      this.yText = this.yDoc.getText('codemirror');
    }
    
    this.currentLanguage = 'javascript';
    
    this.init();
  }
  
  initWithoutYJS() {
    // Create a basic version without YJS dependency
    console.log("Using CodeEditor without YJS support");
    this.hasYJS = false;
  }
  
  init() {
    // Make sure the container is visible
    if (this.container) {
      this.container.style.display = 'block';
    } else {
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
      
      // Ensure editor is initialized and active
      this.editor.refresh();
      this.editor.focus();
      
      // Debug: Test if editor is editable
      console.log("Editor readOnly status:", this.editor.getOption('readOnly'));
      
      // Initialize binding with or without YJS depending on availability
      if (typeof Y !== 'undefined' && this.yDoc) {
        this.initYjsBinding();
      } else {
        // Use the simpler sync mechanism
        this.setupBasicSyncFallback();
      }
    } catch (error) {
      console.error("Error initializing CodeMirror:", error);
    }
    
    // Handle language change
    const langSelect = document.getElementById('language-select');
    if (langSelect) {
      langSelect.addEventListener('change', (e) => {
        this.changeLanguage(e.target.value);
      });
    }
    
    // Handle run code button
    const runButton = document.getElementById('run-code');
    if (runButton) {
      runButton.addEventListener('click', () => {
        this.runCode();
      });
    }
  }
  
  initYjsBinding() {
    try {
      // Make sure CodemirrorBinding is available
      if (typeof CodemirrorBinding === 'undefined') {
        console.error("CodemirrorBinding is not defined");
        this.setupBasicSyncFallback();
        return;
      }
      
      this.binding = new CodemirrorBinding(this.yText, this.editor, null, {
        yUndoManager: new Y.UndoManager(this.yText)
      });
      console.log("Y.js binding initialized successfully");
      
      // Setup Socket.io connection for YJS
      this.setupSocketSync();
    } catch (error) {
      console.error("Error initializing Y.js binding:", error);
      // Fallback to basic editor functionality if Y.js fails
      this.setupBasicSyncFallback();
    }
  }
  
  setupBasicSyncFallback() {
    // Fallback sync mechanism if Y.js fails
    console.log("Using fallback sync mechanism");
    let lastContent = "";
    
    this.editor.on("change", () => {
      const content = this.editor.getValue();
      if (content !== lastContent) {
        this.socket.emit('editor-content-change', {
          content,
          language: this.currentLanguage
        });
        lastContent = content;
      }
    });
    
    this.socket.on('editor-content-update', (data) => {
      if (data.content !== this.editor.getValue()) {
        const cursor = this.editor.getCursor();
        this.editor.setValue(data.content);
        this.editor.setCursor(cursor);
        lastContent = data.content;
      }
    });
    
    // Request initial content from server
    this.socket.emit('get-initial-content', (content) => {
      if (content) {
        this.editor.setValue(content);
        lastContent = content;
      }
    });
  }
  
  /**
   * Setup socket.io as a provider for YJS updates
   */
    /**
   * Setup socket.io as a provider for YJS updates
   */
    setupSocketSync() {
      if (!this.yDoc) return;
      
      // Use a mutex to prevent concurrent updates
      let updatingFromNetwork = false;
      
      // Listen for YJS updates from server
      this.socket.on('ydoc-update', (update) => {
        try {
          // Flag that we're applying a network update
          updatingFromNetwork = true;
          const uint8Array = new Uint8Array(update);
          Y.applyUpdate(this.yDoc, uint8Array);
          // Reset flag after processing the update
          setTimeout(() => {
            updatingFromNetwork = false;
          }, 5); // Small delay to prevent update interference
        } catch (error) {
          updatingFromNetwork = false;
          console.error("Error applying Y.js update:", error);
        }
      });
      
      // Create a throttled version of the emit function
      const throttledEmit = this.throttle((update) => {
        const array = Array.from(update);
        this.socket.emit('ydoc-update', array);
      }, 50); // Increase to 50ms for more stability
      
      // Send updates to server when local YDoc changes
      this.yDoc.on('update', (update) => {
        try {
          // Only emit if the update originated locally
          if (!updatingFromNetwork) {
            // Pass the actual update instead of encoding the entire doc state
            throttledEmit(update);
          }
        } catch (error) {
          console.error("Error sending Y.js update:", error);
        }
      });
      
      // Receive initial state only once on connection
      this.socket.emit('get-ydoc-state', (encodedState) => {
        if (encodedState) {
          try {
            updatingFromNetwork = true;
            const uint8Array = new Uint8Array(encodedState);
            Y.applyUpdate(this.yDoc, uint8Array);
            console.log("Initial Y.js state applied successfully");
            setTimeout(() => {
              updatingFromNetwork = false;
            }, 10);
          } catch (error) {
            updatingFromNetwork = false;
            console.error("Error applying initial Y.js state:", error);
          }
        }
      });
    }
    
    /**
     * Helper method to throttle function calls for better performance
     */
    throttle(func, wait) {
      let lastFunc;
      let lastRan;
      return function(...args) {
        const context = this;
        if (!lastRan) {
          func.apply(context, args);
          lastRan = Date.now();
        } else {
          clearTimeout(lastFunc);
          lastFunc = setTimeout(function() {
            if ((Date.now() - lastRan) >= wait) {
              func.apply(context, args);
              lastRan = Date.now();
            }
          }, wait - (Date.now() - lastRan));
        }
      };
    }
  
  /**
   * Change the editor language mode
   */
  changeLanguage(language) {
    this.currentLanguage = language;
    this.editor.setOption('mode', language);
    
    // Notify others of language change
    this.socket.emit('code-language-change', language);
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
