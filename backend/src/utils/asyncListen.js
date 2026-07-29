function asyncListen(app, port) {
  return new Promise((resolve, reject) => {
    // app.listen returns the underlying HTTP server instance
    const server = app.listen(port, "0.0.0.0", () => {
      resolve(port);
    });

    // Listen for startup errors (like port already in use)
    server.on("error", (err) => {
      reject(err);
    });
  });
}

module.exports = asyncListen;
