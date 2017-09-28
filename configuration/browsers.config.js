// Used by ../../../../tools/browsers-binaries-standalone/ 
// to pre-install required browsers to run tests

const path = require("path");

module.exports = {
    chromium: {
        version: "61.0.3163.100",
        platform: "Win_x64"
    },
    defaultPath: path.join(__dirname, "../browsers")
};
