require('dotenv').config();

const PORT = process.env.PORT || 8080;

module.exports = {
  devServer: {
    https: true,
    progress: false,
    overlay: false,
    proxy: {
      "/api": {
        target: `http://localhost:${PORT}/`,
        logLevel: "debug"
      },
      "/peerjs": {
        target: `http://localhost:${PORT}/`,
        logLevel: "debug"
      }
    }
  }
};