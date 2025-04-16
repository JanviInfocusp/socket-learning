/**
 * DrawingCRDT - A CRDT implementation for collaborative drawing and text editing
 */
class DrawingCRDT {
  constructor(siteId) {
    this.siteId = siteId;
    this.operations = new Map();
    this.sequence = 0;
    this.textContent = ""; // Simple text representation (will be replaced by YJS)
  }
  
  // Generate a unique operation ID
  generateOperationId() {
    return `${this.siteId}:${Date.now()}:${this.sequence++}`;
  }
  
  // Create a new stroke operation
  createStrokeOperation(points, color, lineWidth) {
    const operation = {
      id: this.generateOperationId(),
      type: 'stroke',
      timestamp: Date.now(),
      points: [...points], // Clone the points array
      color: color,
      lineWidth: lineWidth
    };
    
    this.operations.set(operation.id, operation);
    return operation;
  }
  
  // Add a point to an existing stroke
  addPointToStroke(strokeId, point) {
    const operation = this.operations.get(strokeId);
    if (operation && operation.type === 'stroke') {
      operation.points.push(point);
      operation.timestamp = Date.now(); // Update timestamp
      return operation;
    }
    return null;
  }
  
  // Create a text operation (simple implementation)
  createTextOperation(text, language) {
    const operation = {
      id: this.generateOperationId(),
      type: 'text',
      timestamp: Date.now(),
      text: text,
      language: language
    };
    
    this.operations.set(operation.id, operation);
    this.textContent = text;
    return operation;
  }
  
  // Apply an external operation
  applyOperation(operation) {
    // If operation already exists, merge based on timestamps
    if (this.operations.has(operation.id)) {
      const existingOp = this.operations.get(operation.id);
      
      // For strokes, merge points if the incoming operation is newer
      if (operation.type === 'stroke' && operation.timestamp > existingOp.timestamp) {
        // In a real implementation, you might have more complex logic here
        existingOp.points = operation.points;
        existingOp.timestamp = operation.timestamp;
      }
      
      // For text, update content if the incoming operation is newer
      if (operation.type === 'text' && operation.timestamp > existingOp.timestamp) {
        existingOp.text = operation.text;
        existingOp.timestamp = operation.timestamp;
        this.textContent = operation.text;
      }
    } else {
      // If it's a new operation, just add it
      this.operations.set(operation.id, operation);
      
      // Update text content if needed
      if (operation.type === 'text') {
        this.textContent = operation.text;
      }
    }
    
    return this.operations.get(operation.id);
  }
  
  // Get all operations as an array
  getAllOperations() {
    return Array.from(this.operations.values());
  }
  
  // Get latest text operation for a specific language
  getLatestTextOperation(language) {
    let latest = null;
    let latestTimestamp = 0;
    
    for (const op of this.operations.values()) {
      if (op.type === 'text' && op.language === language && op.timestamp > latestTimestamp) {
        latest = op;
        latestTimestamp = op.timestamp;
      }
    }
    
    return latest;
  }
  
  // Clear all operations
  clear() {
    this.operations.clear();
    this.textContent = "";
  }
}
