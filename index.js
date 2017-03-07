var tty = require('./lib/tty.js');
var path = require("path");
var app = tty.createServer({
    shell: 'bash',
    shellArgs: [path.resolve(__dirname, "login.sh")],
    port: 8080
});

app.listen();