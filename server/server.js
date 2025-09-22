// Import necessary modules.
const express = require("express");
const http = require("http");
const path = require("path");
const { setupWSConnection } = require("y-websocket/bin/utils");
const WebSocket = require("ws");

// Set up the HTTP and Websocket servers. Both run on the same port.
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Start server listening for connections on a specified port.
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Serve the frontend application.
const frontendBuildPath = path.join(__dirname, "../frontend/build");
app.use(express.static(frontendBuildPath));
app.get("*", (req, res) => {
  res.sendFile(path.join(frontendBuildPath, "index.html"));
});

// Once the websocket connection is established, set up support to faciliate syncing shared doc
// and awareness with connected clients.
wss.on("connection", setupWSConnection);
