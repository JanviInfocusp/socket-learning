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

    // Set user awareness
    this.provider.awareness.setLocalStateField('user', {
      name: this.generateRandomName(),
      color: this.generateRandomColor()
    });
  }

  private generateRandomName(): string {
    const adjectives = ['Swift', 'Clever', 'Bold', 'Kind', 'Wise', 'Calm'];
    const nouns = ['Coder', 'Engineer', 'Dev', 'Ninja', 'Explorer', 'Writer'];
    return `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}`;
  }

  private generateRandomColor(): string {
    const colors = ['#2ecc71', '#3498db', '#9b59b6', '#f1c40f', '#e67e22', '#e74c3c'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  getDoc() {
    return this.doc;
  }

  getProvider() {
    return this.provider;
  }

  getUserInfo() {
    return this.provider.awareness.getLocalState()?.['user'];
  }
}
