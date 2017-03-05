var tty = require('./lib/tty.js');
var path = require("path");
var app = tty.createServer({
	shell: 'bash',
	shellArgs: [path.resolve(__dirname, "login.sh")],
	port: 8080,
	term: {
		geometry: [90, 30]
	}
});

app.get('/foo',
		function(req, res, next) {
			res.send('bar');
		});

app.listen();
