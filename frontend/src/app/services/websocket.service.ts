import { Injectable } from '@angular/core';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { userColor } from '../constants/user_colors';

@Injectable({
  providedIn: 'root',
})
export class WebsocketService {
  // Shared YJS document holding collaborative data that will be synchronized across all clients.
  private doc: Y.Doc;

  // YJS Websocket provider for connecting to the server and managing real-time updates on the
  // YDoc.
  private provider: WebsocketProvider;

  constructor() {
    // Initialize YDoc and establish WebSocket connection for sending and receiving updates
    // on it.
    this.doc = new Y.Doc();
    this.provider = new WebsocketProvider(
      this.getServerUrl(),
      'collaborative-editor',
      this.doc
    );

    // Set user awareness info (cursor color, name).
    this.provider.awareness.setLocalStateField('user', {
      name: 'User ' + Math.floor(Math.random() * 100),
      color: userColor.color,
      light: userColor.light,
    });
  }

  // Create URL to connect to the server over WebSocket.
  getServerUrl() {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.host;
    return `${wsProtocol}//${wsHost}`;
  }

  // Helper method to access the YJS shared document.
  getDoc() {
    return this.doc;
  }

  // Helper method to access the YJS WebSocket provider.
  getProvider() {
    return this.provider;
  }
}
