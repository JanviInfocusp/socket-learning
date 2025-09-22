import React, { useEffect, useRef, useState } from 'react';
import { useSyncedStore } from '@syncedstore/react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars } from '@codemirror/view';
import { javascript } from '@codemirror/lang-javascript';
import { defaultKeymap, indentWithTab } from '@codemirror/commands';
import { tags } from '@lezer/highlight';
import { HighlightStyle, indentOnInput, bracketMatching, foldGutter, foldKeymap, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { lintKeymap } from '@codemirror/lint';
import { yCollab } from 'y-codemirror.next';
import { store, yText, awareness, AwarenessState } from '../store';
import * as Y from 'yjs';
import { UndoManager } from 'yjs';
import './Editor.css';

const Editor: React.FC = () => {
    const editorRef = useRef<HTMLDivElement>(null);
    const [userInfo, setUserInfo] = useState<AwarenessState['user'] | null>(null);
    const [otherOnlineUsers, setOtherOnlineUsers] = useState<AwarenessState['user'][]>([]);
    const [showOnlineUsersList, setShowOnlineUsersList] = useState(false);
    const state = useSyncedStore(store);


    useEffect(() => {
        if (!yText) return;

        const undoManager = new UndoManager(yText as Y.Text);

        const onAwarenessChange = () => {
            const currentUser = awareness.getLocalState()?.user || null;
            setUserInfo(currentUser);
            const states = Array.from(awareness.getStates().values());
            const otherUsers = states
                .map(state => state.user)
                .filter(user => !!user && user.name !== currentUser?.name);
            setOtherOnlineUsers(otherUsers);
        };

        awareness.on('change', onAwarenessChange);
        // Set initial state
        onAwarenessChange();


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

        const editorState = EditorState.create({
            doc: yText.toString(),
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
                yCollab(yText as Y.Text, awareness, { undoManager }),
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
                            undoManager.undo();
                            return true;
                        },
                    },
                    {
                        key: 'Mod-y',
                        run: () => {
                            undoManager.redo();
                            return true;
                        },
                    },
                    {
                        key: 'Mod-Shift-z',
                        run: () => {
                            undoManager.redo();
                            return true;
                        },
                    },
                ]),
            ],
        });

        const view = new EditorView({
            state: editorState,
            parent: editorRef.current!,
        });

        return () => {
            awareness.off('change', onAwarenessChange);
            view.destroy();
        };
    }, [yText]);

    const toggleOnlineUsersList = () => {
        setShowOnlineUsersList(prev => !prev);
    };

    if (!state) {
        return <div>Loading...</div>
    }

    return (
        <div className="editor-container">
            <div className="doc-actions">
                {userInfo && (
                    <div>
                        <span>You: </span>
                        <span style={{ backgroundColor: userInfo.color }}>{userInfo.name}</span>
                    </div>
                )}
            </div>
            <div className="toolbar">
                <select>
                    <option value="javascript">JavaScript</option>
                </select>
            </div>
            <div ref={editorRef} className="code-editor"></div>
            <button onClick={toggleOnlineUsersList} className="toggle-users-button">
                {showOnlineUsersList ? 'Hide' : 'Show'} online users
            </button>
            {showOnlineUsersList && (
                <ol>
                    {otherOnlineUsers.map(user => (
                         <li key={user.name}>
                            <span style={{ backgroundColor: user.color }}>{user.name}</span>
                        </li>
                    ))}
                </ol>
            )}
        </div>
    );
};

export default Editor;
