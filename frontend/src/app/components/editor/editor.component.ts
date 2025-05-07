import { Component, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WebsocketService } from '../../services/websocket.service';
import * as Y from 'yjs';
import { EditorState, Transaction, StateEffect, StateField } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, Decoration, DecorationSet } from '@codemirror/view';
import { javascript } from '@codemirror/lang-javascript';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { tags } from '@lezer/highlight';
import {
  HighlightStyle,
  defaultHighlightStyle,
  indentOnInput,
  bracketMatching,
  foldGutter,
  foldKeymap,
  syntaxHighlighting
} from '@codemirror/language';
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap, CompletionContext } from '@codemirror/autocomplete';
import { lintKeymap } from '@codemirror/lint';

// Define the shared selection effect and state field at the top level
const addSelectionEffect = StateEffect.define<{ from: number; to: number; color: string }[]>();

const sharedSelectionsField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(selections, tr) {
    selections = selections.map(tr.changes);
    for (let e of tr.effects) {
      if (e.is(addSelectionEffect)) {
        return Decoration.set(
          e.value.map(sel =>
            Decoration.mark({
              class: 'remote-selection',
              attributes: {
                style: `background-color: ${sel.color}40`
              }
            }).range(sel.from, sel.to)
          )
        );
      }
    }
    return selections;
  },
  provide: f => EditorView.decorations.from(f)
});

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.scss']
})
export class EditorComponent implements AfterViewInit {
  @ViewChild('editorContainer') editorContainer!: ElementRef;
  private ytext: Y.Text;
  private editorView?: EditorView;
  selectedLanguage = 'javascript';
  userInfo: { name: string; color: string; rgbColor: string };

  constructor(private wsService: WebsocketService) {
    this.ytext = this.wsService.getDoc().getText('collaborative-editor');
    this.userInfo = this.wsService.getUserInfo();

    this.wsService.getProvider().awareness.on('change', () => {
      const states = Array.from(this.wsService.getProvider().awareness.getStates().values());
      console.log('Connected users:', states.map(state => state['user']));
    });

    this.setupRemoteSelections();
  }

  private setupRemoteSelections() {
    this.wsService.onSelectionChange(selections => {
      if (!this.editorView) return;

      const remoteSelections = selections
        .filter(sel => sel.color !== this.userInfo.color)
        .map(sel => ({
          from: sel.from,
          to: sel.to,
          color: sel.color
        }));

      if (remoteSelections.length > 0) {
        this.editorView.dispatch({
          effects: addSelectionEffect.of(remoteSelections)
        });
      }
    });
  }

  ngAfterViewInit() {
    if (this.editorContainer?.nativeElement) {
      this.initializeEditor();
    }
  }

  private initializeEditor() {
    const syntaxStyles = HighlightStyle.define([
      { tag: tags.keyword, color: "#0000ff", fontWeight: "bold" },
      { tag: tags.comment, color: "#008000", fontStyle: "italic" },
      { tag: tags.string, color: "#a31515" },
      { tag: tags.number, color: "#098658" },
      { tag: tags.operator, color: "#000000" },
      { tag: tags.variableName, color: "#001080" },
      { tag: tags.propertyName, color: "#001080" },
      { tag: tags.function(tags.variableName), color: "#795E26" },
      { tag: tags.definition(tags.propertyName), color: "#001080" }
    ]);

    const state = EditorState.create({
      doc: this.ytext.toString(),
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        foldGutter(),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        autocompletion(),
        this.getLanguageExtension(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        syntaxHighlighting(syntaxStyles),
        EditorView.theme({
          "&": { height: "100%" },
          ".cm-scroller": {
            fontFamily: "'Fira Code', 'Consolas', 'Monaco', monospace",
            fontSize: "14px",
            lineHeight: "1.5"
          },
          ".cm-cursor, .cm-dropCursor": {
            borderLeftWidth: "2px",
            borderLeftStyle: "solid",
            borderLeftColor: `rgb(${this.userInfo.rgbColor}) !important`
          },
          ".cm-selectionBackground, .cm-content ::selection": {
            backgroundColor: `rgba(${this.userInfo.rgbColor}, 0.3) !important`
          },
          "&.cm-focused .cm-selectionBackground": {
            backgroundColor: `rgba(${this.userInfo.rgbColor}, 0.4) !important`
          },
          ".cm-activeLine": {
            backgroundColor: `rgba(${this.userInfo.rgbColor}, 0.07) !important`
          },
          ".cm-activeLineGutter": {
            backgroundColor: `rgba(${this.userInfo.rgbColor}, 0.07) !important`
          },
          ".remote-selection": {
            borderRadius: "2px",
            transition: "background-color 0.3s ease"
          }
        }),
        EditorView.lineWrapping,
        EditorState.tabSize.of(2),
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          ...foldKeymap,
          ...completionKeymap,
          ...closeBracketsKeymap,
          ...lintKeymap,
          indentWithTab
        ]),
        EditorView.updateListener.of(update => {
          if (update.docChanged) {
            const content = update.state.doc.toString();
            if (content !== this.ytext.toString()) {
              this.ytext.delete(0, this.ytext.length);
              this.ytext.insert(0, content);
            }
          }
          if (update.selectionSet) {
            const { from, to } = update.state.selection.main;
            this.wsService.updateSelection(from, to);
          }
        }),
        sharedSelectionsField
      ]
    });

    this.editorView = new EditorView({
      state,
      parent: this.editorContainer.nativeElement
    });

    this.ytext.observe(event => {
      const content = this.ytext.toString();
      if (content !== this.editorView?.state.doc.toString()) {
        this.editorView?.dispatch({
          changes: {
            from: 0,
            to: this.editorView.state.doc.length,
            insert: content
          },
          annotations: [Transaction.remote.of(true)]
        });
      }
    });
  }

  private getLanguageExtension() {
    switch (this.selectedLanguage) {
      case 'javascript':
        return javascript({ jsx: false });
      case 'typescript':
        return javascript({ typescript: true });
      default:
        return javascript();
    }
  }

  onLanguageChange() {
    if (this.editorView) {
      const content = this.editorView.state.doc.toString();
      this.editorView.destroy();
      this.initializeEditor();
    }
  }
}
