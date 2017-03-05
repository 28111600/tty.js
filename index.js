var tty = require('./lib/tty.js');
var path = require("path");
var app = tty.createServer({
    shell: 'bash',
    shellArgs: [path.resolve(__dirname, "login.sh")],
    port: 8080,
    term: {
        geometry: [80, 25]
    }
});

app.listen();