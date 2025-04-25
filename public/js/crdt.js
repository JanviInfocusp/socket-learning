class CRDTChar {
  constructor(value, pos, siteId, clock) {
    this.value = value;
    this.pos = pos;      // Position identifier array
    this.siteId = siteId;// Unique site identifier
    this.clock = clock;  // Logical clock
  }
}

class CRDT {
  constructor(siteId) {
    this.struct = [];    // Array of CRDTChar objects
    this.siteId = siteId;
    this.clock = 0;
    this.base = 32;     // Base for generating position identifiers
    this.boundary = 10;  // Minimum spacing between positions
  }

  // Generate position identifier between two positions
  generatePosBetween(pos1, pos2) {
    if (!pos1) pos1 = [];
    if (!pos2) pos2 = [];
    
    let newPos = pos1.slice();
    let id = this.generateIdBetween(
      pos1[0] || 0,
      pos2[0] || this.base,
      newPos.length
    );
    
    newPos.push(id);
    return newPos;
  }

  // Generate a number between two values
  generateIdBetween(min, max, level) {
    if (max - min < this.boundary) {
      max = min + this.boundary * 2;
    }
    let id = Math.floor((min + max) / 2);
    return id;
  }

  // Local insert operation
  localInsert(value, index) {
    const char = this.insert(value, index);
    return char;
  }

  // Remote insert operation
  remoteInsert(char) {
    let index = this.findInsertIndex(char);
    this.struct.splice(index, 0, char);
    return index;
  }

  // Find index to insert character
  findInsertIndex(char) {
    let index = 0;
    while (index < this.struct.length && this.comparePos(this.struct[index].pos, char.pos)) {
      index++;
    }
    return index;
  }

  // Compare position identifiers
  comparePos(pos1, pos2) {
    for (let i = 0; i < Math.min(pos1.length, pos2.length); i++) {
      if (pos1[i] < pos2[i]) return true;
      if (pos1[i] > pos2[i]) return false;
    }
    return pos1.length < pos2.length;
  }

  // Insert operation
  insert(value, index) {
    this.clock++;
    
    const posBefore = index > 0 ? this.struct[index - 1].pos : [];
    const posAfter = index < this.struct.length ? this.struct[index].pos : [];
    const newPos = this.generatePosBetween(posBefore, posAfter);
    
    const char = new CRDTChar(value, newPos, this.siteId, this.clock);
    this.struct.splice(index, 0, char);
    
    return char;
  }

  // Delete operation
  delete(index) {
    const char = this.struct[index];
    this.struct.splice(index, 1);
    return char;
  }

  // Get text content
  toString() {
    return this.struct.map(char => char.value).join('');
  }
}
