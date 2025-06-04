import { Injectable } from '@angular/core';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { userColor, userName } from '../constants/user_constants';

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {
  private doc: Y.Doc;
  private provider: WebsocketProvider;

  constructor() {
    this.doc = new Y.Doc();
    this.provider = new WebsocketProvider(
      'ws://localhost:3000',
      'collaborative-editor',
      this.doc
    );
    this.provider.awareness.setLocalStateField('user', {
      name: userName,
      color: userColor.color,
      light: userColor.light,
    });
  }

  getDoc() {
    return this.doc;
  }

  getProvider() {
    return this.provider;
  }
}
