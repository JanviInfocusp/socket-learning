import { syncedStore, getYjsValue } from "@syncedstore/core";
import * as Y from "yjs";
import { WebsocketProvider } from 'y-websocket';
import { userColor } from './constants/user_colors';

export interface AwarenessState {
    user: {
      name: string;
      color: string;
      light: string;
    };
  }
// Create a Yjs document
const doc = new Y.Doc();


const getServerUrl = () => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.host;
    return `${wsProtocol}//${wsHost}`;
  }

// Create a websocket provider
const provider = new WebsocketProvider(
    getServerUrl(),
    'collaborative-editor',
    doc
  );

  provider.awareness.setLocalStateField('user', {
    name: 'User ' + Math.floor(Math.random() * 100),
    color: userColor.color,
    light: userColor.light,
  });


export const awareness = provider.awareness;

// Create the synced store
export const store = syncedStore({ codemirrorText: new Y.Text() }, doc);

// Get the Yjs text instance
export const yText = getYjsValue(store.codemirrorText);
