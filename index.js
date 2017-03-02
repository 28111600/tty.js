var tty = require('./lib/tty.js');
var path = require("path");
var app = tty.createServer({
    shell: 'sh',
    shellArgs: [path.join(process.cwd(), "login.sh")],
    port: 8080
});

app.get('/foo',
function(req, res, next) {
    res.send('bar');
});

app.listen();
