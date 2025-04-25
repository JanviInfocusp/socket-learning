/**
 * Represents a character in the CRDT structure
 * Each character has:
 * - value: the actual character
 * - position: unique position identifier
 * - siteId: which client created it
 * - clock: local timestamp when it was created
 */
class CRDTChar {
  constructor(value, position, siteId, clock) {
    this.value = value;
    this.position = position;
    this.siteId = siteId;
    this.clock = clock;
  }
}

/**
 * CRDT (Conflict-free Replicated Data Type) implementation
 * Handles collaborative text editing by:
 * - Giving each character a unique position
 * - Managing concurrent edits from multiple users
 * - Ensuring eventual consistency
 */
class CRDT {
  constructor(siteId) {
    this.siteId = siteId;        // Unique ID for this client
    this.clock = 0;              // Local logical clock
    this.characters = [];        // Ordered array of characters
    this.minGap = 10;           // Minimum gap between positions
    this.baseDigit = 32;        // Base number for position calculations
  }

  // Insert a character locally and return the CRDT character
  insertChar(char, index) {
    this.clock++;
    
    // Get positions before and after insertion point
    const prevPos = index > 0 ? this.characters[index - 1].position : [];
    const nextPos = index < this.characters.length ? this.characters[index].position : [];
    
    // Create new position between prevPos and nextPos
    const newPos = this.generatePositionBetween(prevPos, nextPos);
    
    // Create and insert the new character
    const crdtChar = new CRDTChar(char, newPos, this.siteId, this.clock);
    this.characters.splice(index, 0, crdtChar);
    
    return crdtChar;
  }

  // Insert a character received from another site
  insertRemoteChar(crdtChar) {
    // Find the correct position to insert
    const index = this.findInsertPosition(crdtChar);
    this.characters.splice(index, 0, crdtChar);
    return index;
  }

  // Delete a character at given index
  deleteChar(index) {
    return this.characters.splice(index, 1)[0];
  }

  // Generate a position identifier between two positions
  generatePositionBetween(pos1, pos2) {
    pos1 = pos1 || [];  // Default to empty array if undefined
    pos2 = pos2 || [];  // Default to empty array if undefined
    
    let newPos = pos1.slice(); // Copy pos1
    
    // Generate a number between pos1 and pos2
    let digit = this.generateDigitBetween(
      pos1[0] || 0,
      pos2[0] || this.baseDigit
    );
    
    newPos.push(digit);
    return newPos;
  }

  // Generate a number between min and max with minimum gap
  generateDigitBetween(min, max) {
    if (max - min < this.minGap) {
      max = min + (this.minGap * 2);
    }
    return Math.floor((min + max) / 2);
  }

  // Find the correct position to insert a character
  findInsertPosition(char) {
    let index = 0;
    while (index < this.characters.length && 
           this.comparePositions(this.characters[index].position, char.position)) {
      index++;
    }
    return index;
  }

  // Compare two position identifiers
  comparePositions(pos1, pos2) {
    for (let i = 0; i < Math.min(pos1.length, pos2.length); i++) {
      if (pos1[i] < pos2[i]) return true;
      if (pos1[i] > pos2[i]) return false;
    }
    return pos1.length < pos2.length;
  }

  // Get the current text content
  getText() {
    return this.characters.map(char => char.value).join('');
  }
}
