import { Injectable } from '@angular/core';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { userColor } from '../constants/user_colors';

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {
  private doc: Y.Doc;
  private provider: WebsocketProvider;

  constructor() {
    this.doc = new Y.Doc();
    this.provider = new WebsocketProvider(
      this.getServerUrl(),
      'collaborative-editor',
      this.doc
    );
    this.provider.awareness.setLocalStateField('user', {
      name: 'User ' + Math.floor(Math.random() * 100),
      color: userColor.color,
      light: userColor.light,
    });
  }

  getServerUrl() {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.host;
    return `${wsProtocol}//${wsHost}`;
  }

  getDoc() {
    return this.doc;
  }

  getProvider() {
    return this.provider;
  }
}
