import { Component, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WebsocketService } from '../../services/websocket.service';
import * as Y from 'yjs';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars } from '@codemirror/view';
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

  constructor(private wsService: WebsocketService) {
    this.ytext = this.wsService.getDoc().getText('collaborative-editor');
  }

  ngAfterViewInit() {
    if (this.editorContainer?.nativeElement) {
      this.initializeEditor();
    }
  }

  private initializeEditor() {
    // Create custom syntax highlighting
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
          "&": {
            height: "100%"
          },
          ".cm-scroller": {
            fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
            fontSize: "14px",
            lineHeight: "1.5"
          }
        }),
        EditorView.lineWrapping,
        EditorState.tabSize.of(2),
        EditorState.allowMultipleSelections.of(true),
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
            const cursorPos = update.state.selection.main.head;

            if (content !== this.ytext.toString()) {
              const prevContent = this.ytext.toString();
              let start = 0;
              while (start < Math.min(prevContent.length, content.length) &&
                     prevContent[start] === content[start]) {
                start++;
              }

              let deleteCount = prevContent.length - start;
              let insertText = content.slice(start);

              this.ytext.delete(start, deleteCount);
              if (insertText) {
                this.ytext.insert(start, insertText);
              }
            }
          }
        })
      ]
    });

    this.editorView = new EditorView({
      state,
      parent: this.editorContainer.nativeElement
    });

    this.ytext.observe(event => {
      const content = this.ytext.toString();
      if (content !== this.editorView?.state.doc.toString()) {
        const cursorPos = this.editorView?.state.selection.main.head || 0;

        this.editorView?.dispatch({
          changes: {
            from: 0,
            to: this.editorView.state.doc.length,
            insert: content
          },
          selection: { anchor: cursorPos, head: cursorPos }
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
