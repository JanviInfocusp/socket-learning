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

    // Set user awareness
    this.provider.awareness.setLocalStateField('user', {
      name: userName,
      color: userColor.color,
      light: userColor.light,
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

  private hexToRgb(hex: string) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  getDoc() {
    return this.doc;
  }

  getProvider() {
    return this.provider;
  }

  getUserInfo() {
    const user = this.provider.awareness.getLocalState()?.['user'];
    const rgb = this.hexToRgb(user.color);
    return {
      ...user,
      name: `<${user.name}>`,
      rgbColor: rgb ? `${rgb.r}, ${rgb.g}, ${rgb.b}` : '0, 0, 0'
    };
  }

  updateSelection(from: number, to: number) {
    const user = this.provider.awareness.getLocalState()?.['user'];
    this.provider.awareness.setLocalStateField('selection', { 
      from, 
      to, 
      color: user.color,
      name: user.name 
    });
  }

  onSelectionChange(callback: (selections: any[]) => void) {
    this.provider.awareness.on('change', () => {
      const states = Array.from(this.provider.awareness.getStates().values());
      const selections = states
        .filter(state => state['selection'] && state['user'])
        .map(state => ({
          from: state['selection']['from'],
          to: state['selection']['to'],
          color: state['user']['color'],
          name: state['user']['name']
        }));
      callback(selections);
    });
  }
}
