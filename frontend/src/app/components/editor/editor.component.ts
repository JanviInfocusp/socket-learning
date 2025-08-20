import {
  Component,
  AfterViewInit,
  ElementRef,
  ViewChild,
  OnDestroy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WebsocketService } from '../../services/websocket.service';
import * as Y from 'yjs';
import { UndoManager } from 'yjs';
import { EditorState } from '@codemirror/state';
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLineGutter,
  highlightSpecialChars,
} from '@codemirror/view';
import { javascript } from '@codemirror/lang-javascript';
import { defaultKeymap, indentWithTab } from '@codemirror/commands';
import { tags } from '@lezer/highlight';
import {
  HighlightStyle,
  defaultHighlightStyle,
  indentOnInput,
  bracketMatching,
  foldGutter,
  foldKeymap,
  syntaxHighlighting,
} from '@codemirror/language';
import {
  autocompletion,
  completionKeymap,
  closeBrackets,
  closeBracketsKeymap,
} from '@codemirror/autocomplete';
import { lintKeymap } from '@codemirror/lint';
import { yCollab } from 'y-codemirror.next';

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.scss'],
})
export class EditorComponent implements AfterViewInit, OnDestroy {
  @ViewChild('editorContainer') editorContainer!: ElementRef;
  private ytext: Y.Text;
  private editorView?: EditorView;
  private undoManager: UndoManager;
  selectedLanguage = 'javascript';
  userInfo: Record<string, any> | null = null;
  otherOnlineUsers: Record<string, any>[] = [];
  showOnlineUsersList = false;

  constructor(private wsService: WebsocketService) {
    // Initialize Yjs text (shared data type) within the shared Yjs document.
    // All connected clients will collaborate on this text within the shared document.
    this.ytext = this.wsService.getDoc().getText('collaborative-editor');

    // Initialize current user's info.
    this.userInfo = this.wsService.getProvider().awareness.getLocalState()?.[
      'user'
    ];

    // Listen to awareness changes to update other online users' list.
    this.wsService.getProvider().awareness.on('change', () => {
      const states = [
        ...this.wsService.getProvider().awareness.getStates().values(),
      ];
      this.otherOnlineUsers = states
        .map((state) => state['user'])
        .filter((user) => !!user && user['name'] !== this.userInfo?.['name']);
    });

    // Configure undo manager to not track changes from other clients.
    this.undoManager = new UndoManager(this.ytext, {
      trackedOrigins: new Set([null]),
    });
  }

  ngAfterViewInit() {
    if (this.editorContainer?.nativeElement) {
      this.initializeEditor();
    }
  }

  ngOnDestroy() {
    this.undoManager.destroy();
    this.editorView?.destroy();
  }

  // Toggle visibility of the online users list.
  toggleOnlineUsersList() {
    this.showOnlineUsersList = !this.showOnlineUsersList;
  }

  private initializeEditor() {
    // Define highlighting rules for various syntax elements.
    const syntaxStyles = HighlightStyle.define([
      { tag: tags.keyword, color: '#0000ff', fontWeight: 'bold' },
      { tag: tags.comment, color: '#008000', fontStyle: 'italic' },
      { tag: tags.string, color: '#a31515' },
      { tag: tags.number, color: '#098658' },
      { tag: tags.operator, color: '#000000' },
      { tag: tags.variableName, color: '#001080' },
      { tag: tags.propertyName, color: '#001080' },
      { tag: tags.function(tags.variableName), color: '#795E26' },
      { tag: tags.definition(tags.propertyName), color: '#001080' },
    ]);

    // Define Codemirror editor state with various extensions that enable common IDE features.
    const state = EditorState.create({
      doc: this.ytext.toString(),
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        foldGutter(),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        autocompletion(),
        javascript(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        syntaxHighlighting(syntaxStyles),
        // Bind YJS shared text, awareness, and undo manager to the Codemirror editor.
        yCollab(this.ytext, this.wsService.getProvider().awareness, {
          undoManager: this.undoManager,
        }),
        EditorView.theme({
          '&': { height: '100%' },
          '.cm-content': {
            fontSize: '20px',
            paddingTop: '16px',
          },
          '.cm-scroller': {
            fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
            fontSize: '14px',
            lineHeight: '1.5',
          },
        }),
        EditorView.lineWrapping,
        EditorState.tabSize.of(2),
        keymap.of([
          ...defaultKeymap,
          ...foldKeymap,
          ...completionKeymap,
          ...closeBracketsKeymap,
          ...lintKeymap,
          indentWithTab,
          {
            key: 'Mod-z',
            run: () => {
              if (this.undoManager.canUndo()) {
                this.undoManager.undo();
                return true;
              }
              return false;
            },
          },
          {
            key: 'Mod-y',
            run: () => {
              if (this.undoManager.canRedo()) {
                this.undoManager.redo();
                return true;
              }
              return false;
            },
          },
          {
            key: 'Mod-Shift-z',
            run: () => {
              if (this.undoManager.canRedo()) {
                this.undoManager.redo();
                return true;
              }
              return false;
            },
          },
        ]),
      ],
    });

    // Initialize the codemirror editor view with the above defined state and render it over the UI.
    this.editorView = new EditorView({
      state,
      parent: this.editorContainer.nativeElement,
    });
  }
}
