import { Injectable } from '@angular/core';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

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
  }

  getDoc() {
    return this.doc;
  }

  getProvider() {
    return this.provider;
  }
}
