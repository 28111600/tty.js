/**
 * tty.js
 * Copyright (c) 2012-2013, Christopher Jeffrey (MIT License)
 */

;
(function() {

    /**
     * Elements
     */

    var document = this.document,
        window = this,
        root, body, h1, open;

    /**
     * Initial Document Title
     */

    var initialTitle = document.title;

    /**
     * Helpers
     */

    var EventEmitter = Terminal.EventEmitter,
        inherits = Terminal.inherits,
        on = Terminal.on,
        off = Terminal.off,
        cancel = Terminal.cancel;

    /**
     * tty
     */

    var tty = new EventEmitter;

    /**
     * Shared
     */

    tty.socket;
    tty.windows;
    tty.terms;
    tty.elements;

    /**
     * Open
     */

    var isHidden = false;
    document.addEventListener("visibilitychange", function() {
        isHidden = document.hidden;
        if (!isHidden) {

            setTitle();

        }
    }, false);


    var _getObjectChildCount = function(obj) {
        var count = 0;
        for (var name in obj) {
            count++;
        }
        return count;
    }

    window.onbeforeunload = function() {
        if (_getObjectChildCount(tty.terms) != 0) {
            return true;
        }
    }

    tty.open = function() {
        if (document.location.pathname) {
            var parts = document.location.pathname.split('/'),
                base = parts.slice(0, parts.length - 1).join('/') + '/',
                resource = base.substring(1) + 'socket.io';

            tty.socket = io.connect(null, { resource: resource });
        } else {
            tty.socket = io.connect();
        }

        tty.windows = [];
        tty.terms = {};

        tty.elements = {
            root: document.documentElement,
            body: document.body,
            h1: document.getElementsByTagName('h1')[0],
            open: document.getElementById('open')
        };

        root = tty.elements.root;
        body = tty.elements.body;
        h1 = tty.elements.h1;
        open = tty.elements.open;

        if (open) {
            on(open, 'click', function() {
                new Window;
            });
        }


        tty.socket.on('connect', function() {
            tty.reset();
            tty.emit('connect');
        });

        tty.socket.on('data', function(id, data) {
            if (!tty.terms[id]) return;
            tty.terms[id].write(data);
        });

        tty.socket.on('kill', function(id) {
            if (!tty.terms[id]) return;
            tty.terms[id]._destroy();
        });

        // XXX Clean this up.
        tty.socket.on('sync', function(terms) {

            tty.reset();

            var emit = tty.socket.emit;
            tty.socket.emit = function() {};

            Object.keys(terms).forEach(function(key) {
                var data = terms[key],
                    win = new Window,
                    tab = win.tabs[0];

                delete tty.terms[tab.id];
                tab.pty = data.pty;
                tab.id = data.id;
                tty.terms[data.id] = tab;
                win.resize(data.cols, data.rows);
                //  tab.setProcessName(data.process);
                tty.emit('open tab', tab);
                tab.emit('open');
            });

            tty.socket.emit = emit;
        });

        // We would need to poll the os on the serverside
        // anyway. there's really no clean way to do this.
        // This is just easier to do on the
        // clientside, rather than poll on the
        // server, and *then* send it to the client.
        setInterval(function() {
            var i = tty.windows.length;
            while (i--) {
                if (!tty.windows[i].focused) continue;
                tty.windows[i].focused.pollProcessName();
            }
        }, 2 * 1000);

        tty.emit('load');
        tty.emit('open');
    };

    /**
     * Reset
     */

    tty.reset = function() {
        var i = tty.windows.length;
        while (i--) {
            tty.windows[i].destroy();
        }

        tty.windows = [];
        tty.terms = {};

        tty.emit('reset');
    };


    var setTitle = (function() {
        var _title;
        return function(title) {

            document.title = (isHidden ? "*" : "") + (tty.windows.length ? ("[" + (tty.windows.length) + "]") : "") + (title || _title);
            _title = title || _title;
        }
    })();

    /**
     * Window
     */

    function Window(socket) {
        var self = this;

        EventEmitter.call(this);

        var el, grip, bar, btnClose, title, statusbar, size, content;

        el = document.createElement('div');
        el.className = 'terminal-content';

        content = document.createElement('div');
        content.className = "window";

        grip = document.createElement('div');
        grip.className = 'grip';

        bar = document.createElement('div');
        bar.className = 'bar';

        btnClose = document.createElement('span');
        btnClose.innerHTML = '<i class="iconfont icon-guanbi2" >';
        btnClose.title = 'Close';
        btnClose.className = 'tab close';

        title = document.createElement('span');
        title.className = 'tab title';
        title.innerHTML = '';

        statusbar = document.createElement('div');
        statusbar.className = 'statusbar';

        size = document.createElement('span');
        size.className = 'tab size';
        size.innerHTML = '';

        this.socket = socket || tty.socket;
        this.element = el;
        this.content = content;
        this.grip = grip;
        this.bar = bar;
        this.btnClose = btnClose;
        this.title = title;
        this.statusbar = statusbar;
        this.size = size;

        this.tabs = [];
        this.focused = null;

        this.cols = Terminal.geometry[0];
        this.rows = Terminal.geometry[1];

        el.appendChild(grip);


        bar.appendChild(btnClose);
        bar.appendChild(title);
        statusbar.appendChild(size);

        content.appendChild(bar);
        content.appendChild(el);
        content.appendChild(statusbar);

        var main = document.querySelector("#main");
        main.appendChild(content);



        tty.windows.push(this);

        this.createTab();
        this.focus();
        this.bind();
        this.tabs[0].once('open', function() {
            self.resize(self.cols, self.rows);
            tty.emit('open window', self);
            self.emit('open');
        });

    }

    inherits(Window, EventEmitter);

    Window.prototype.bind = function() {
        var self = this,
            el = this.element,
            content = this.content,
            bar = this.bar,
            grip = this.grip,
            btnClose = this.btnClose;
        //  last = 0;

        on(btnClose, 'click', function(ev) {
            self.destroy();
            return cancel(ev);
        });

        on(grip, 'mousedown', function(ev) {
            self.focus();
            self.resizing(ev);
            return cancel(ev);
        });

        on(content, 'mousedown', function(ev) {
            if (ev.target !== el && ev.target !== bar) return;

            self.focus();

            cancel(ev);

            self.drag(ev);

            return cancel(ev);
        });
    };

    Window.prototype.focus = function() {
        // Restack
        var content = this.content
        var parent = content.parentNode;
        if (parent) {
            parent.removeChild(content);
            parent.appendChild(content);
        }

        // Focus Foreground Tab
        this.focused.focus();

        this.focused.handleTitle(this.focused.title);
        tty.emit('focus window', this);
        this.emit('focus');
    };

    Window.prototype.destroy = function() {
        if (this.destroyed) return;
        this.destroyed = true;

        splice(tty.windows, this);
        if (tty.windows.length) tty.windows[0].focus();

        this.content.parentNode.removeChild(this.content);

        this.each(function(term) {
            term.destroy();
        });

        setTitle(tty.windows.focused ? tty.window.focused.title : initialTitle);
        tty.emit('close window', this);
        this.emit('close');
    };

    var getDragRange = function(el, content) {

        var range = {
            x: { min: 0, max: content.clientWidth },
            y: { min: 0, max: content.clientHeight }
        }
        return range;
    }

    Window.prototype.drag = function(ev) {
        var self = this,
            content = this.content;

        var drag = {
            left: content.offsetLeft,
            top: content.offsetTop,
            pageX: ev.pageX,
            pageY: ev.pageY
        };

        var w = content.clientWidth,
            h = content.clientHeight;
        //el.style.opacity = '0.60';
        var range = getDragRange(content, body);

        function move(ev) {
            var x = (drag.left + ev.pageX - drag.pageX);
            var y = (drag.top + ev.pageY - drag.pageY);

            x = Math.max(Math.min(x, range.x.max - w), range.x.min);
            y = Math.max(Math.min(y, range.y.max - h), range.y.min);

            content.style.left = x + 'px';
            content.style.top = y + 'px';
        }

        function up() {

            off(document, 'mousemove', move);
            off(document, 'mouseup', up);

            var ev = {
                left: content.style.left.replace(/\w+/g, ''),
                top: content.style.top.replace(/\w+/g, '')
            };

            tty.emit('drag window', self, ev);
            self.emit('drag', ev);
        }

        on(document, 'mousemove', move);
        on(document, 'mouseup', up);
    };

    Window.prototype.resizing = function(ev) {
        var self = this,
            el = this.element,
            term = this.focused;

        var min = {
            cols: 60,
            rows: 15

        }

        var resize = {
            w: term.element.clientWidth,
            h: term.element.clientHeight
        };

        var size = {
            x: ev.pageX,
            y: ev.pageY,
            w: term.element.clientWidth,
            h: term.element.clientHeight
        };



        root.style.cursor = 'se-resize';
        // term.element.style.height = '100%';

        function move(ev) {

            var x = (size.w + ev.pageX - size.x) / resize.w;
            var y = (size.h + ev.pageY - size.y) / resize.h;

            var cols = ((x * term.cols) | 0);
            var rows = ((y * term.rows) | 0);

            var cols = Math.max(cols, min.cols);
            var rows = Math.max(rows, min.rows);



            var w = (cols / term.cols) * resize.w;
            var h = (rows / term.rows) * resize.h;

            el.style.width = w + 'px';
            el.style.height = h + 'px';


            self.setSize(cols, rows);

        }

        function up(ev) {

            var x = (size.w + ev.pageX - size.x) / resize.w;
            var y = (size.h + ev.pageY - size.y) / resize.h;


            var cols = ((x * term.cols) | 0);
            var rows = ((y * term.rows) | 0);

            var cols = Math.max(cols, min.cols);
            var rows = Math.max(rows, min.rows);


            self.resize(cols, rows);


            self.setSize(cols, rows);

            el.style.width = '';
            el.style.height = '';


            root.style.cursor = '';
            // term.element.style.height = '';

            off(document, 'mousemove', move);
            off(document, 'mouseup', up);
        }

        on(document, 'mousemove', move);
        on(document, 'mouseup', up);

    };
    Window.prototype.setSize = function(cols, rows) {
        var size = this.size;
        size.innerHTML = cols + "×" + rows;
    }

    Window.prototype.resize = function(cols, rows) {
        this.cols = cols;
        this.rows = rows;

        this.each(function(term) {
            term.resize(cols, rows);
        });

        this.setSize(cols, rows);
        tty.emit('resize window', this, cols, rows);
        this.emit('resize', cols, rows);
    };

    Window.prototype.each = function(func) {
        var i = this.tabs.length;
        while (i--) {
            func(this.tabs[i], i);
        }
    };

    Window.prototype.createTab = function() {
        return new Tab(this, this.socket);
    };

    Window.prototype.highlight = function() {
        var self = this;

        this.element.style.borderColor = 'orange';
        setTimeout(function() {
            self.element.style.borderColor = '';
        }, 200);

        this.focus();
    };

    Window.prototype.focusTab = function(next) {
        var tabs = this.tabs,
            i = indexOf(tabs, this.focused),
            l = tabs.length;

        if (!next) {
            if (tabs[--i]) return tabs[i].focus();
            if (tabs[--l]) return tabs[l].focus();
        } else {
            if (tabs[++i]) return tabs[i].focus();
            if (tabs[0]) return tabs[0].focus();
        }

        return this.focused && this.focused.focus();
    };

    Window.prototype.nextTab = function() {
        return this.focusTab(true);
    };

    Window.prototype.previousTab = function() {
        return this.focusTab(false);
    };

    /**
     * Tab
     */

    function Tab(win, socket) {
        var self = this;

        var cols = win.cols,
            rows = win.rows;

        Terminal.call(this, {
            cols: cols,
            rows: rows
        });

        var btnClose = document.createElement('div');
        btnClose.className = 'tab switch-tab';
        btnClose.innerHTML = '<i class="iconfont icon-danxuan" >';
        win.bar.appendChild(btnClose);

        on(btnClose, 'click', function(ev) {

            self.focus();
            return cancel(ev);
        });

        this.id = '';
        this.socket = socket || tty.socket;
        this.window = win;
        this.btnClose = btnClose;
        this.element = null;
        this.process = '';
        this.open();
        this.hookKeys();

        win.tabs.push(this);

        this.socket.emit('create', cols, rows, function(err, data) {
            if (err) return self._destroy();
            self.pty = data.pty;
            self.id = data.id;
            tty.terms[self.id] = self;
            // self.setProcessName(data.process);
            tty.emit('open tab', self);
            self.emit('open');
        });
    };

    inherits(Tab, Terminal);

    // We could just hook in `tab.on('data', ...)`
    // in the constructor, but this is faster.
    Tab.prototype.handler = function(data) {
        this.socket.emit('data', this.id, data);
    };


    // We could just hook in `tab.on('title', ...)`
    // in the constructor, but this is faster.
    Tab.prototype.handleTitle = function(title) {
        if (!title) return;

        title = sanitize(title);
        this.title = title;

        if (Terminal.focus === this) {

            setTitle(title)
                // if (h1) h1.innerHTML = title;
        }

        if (this.window.focused === this) {
            this.window.bar.title = title;
            this.window.title.innerHTML = title;

            // this.setProcessName(this.process);
        }
    };

    Tab.prototype._write = Tab.prototype.write;

    Tab.prototype.write = function(data) {
        //  if (this.window.focused !== this) this.btnClose.style.color = 'red';
        if (isHidden) { setTitle() };
        return this._write(data);
    };

    Tab.prototype._focus = Tab.prototype.focus;

    Tab.prototype.focus = function() {
        if (Terminal.focus === this) return;

        var win = this.window;

        // maybe move to Tab.prototype.switch
        if (win.focused !== this) {
            if (win.focused) {
                if (win.focused.element.parentNode) {
                    win.focused.element.parentNode.removeChild(win.focused.element);
                }
                win.focused.btnClose.style.fontWeight = '';
            }

            win.element.appendChild(this.element);
            win.focused = this;

            this.handleTitle(this.title || initialTitle);
            // this.btnClose.style.fontWeight = 'bold';
            //this.btnClose.style.color = '';
        }

        this.handleTitle(this.title);

        this._focus();

        win.focus();

        tty.emit('focus tab', this);
        this.emit('focus');
    };

    Tab.prototype._resize = Tab.prototype.resize;

    Tab.prototype.resize = function(cols, rows) {
        this.socket.emit('resize', this.id, cols, rows);
        this._resize(cols, rows);
        tty.emit('resize tab', this, cols, rows);
        this.emit('resize', cols, rows);
    };

    Tab.prototype.__destroy = Tab.prototype.destroy;

    Tab.prototype._destroy = function() {
        if (this.destroyed) return;
        this.destroyed = true;

        var win = this.window;

        this.btnClose.parentNode.removeChild(this.btnClose);
        if (this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }

        if (tty.terms[this.id]) delete tty.terms[this.id];
        splice(win.tabs, this);

        if (win.focused === this) {
            win.previousTab();
        }

        if (!win.tabs.length) {
            win.destroy();
        }

        // if (!tty.windows.length) {
        //   document.title = initialTitle;
        //   if (h1) h1.innerHTML = initialTitle;
        // }

        this.__destroy();
    };

    Tab.prototype.destroy = function() {
        if (this.destroyed) return;
        this.socket.emit('kill', this.id);
        this._destroy();
        tty.emit('close tab', this);
        this.emit('close');
    };

    Tab.prototype.hookKeys = function() {
        var self = this;

        // Alt-[jk] to quickly swap between windows.
        this.on('key', function(key, ev) {
            if (Terminal.focusKeys === false) {
                return;
            }

            var offset, i;

            if (key === '\x1bj') {
                offset = -1;
            } else if (key === '\x1bk') {
                offset = +1;
            } else {
                return;
            }

            i = indexOf(tty.windows, this.window) + offset;

            this._ignoreNext();

            if (tty.windows[i]) return tty.windows[i].highlight();

            if (offset > 0) {
                if (tty.windows[0]) return tty.windows[0].highlight();
            } else {
                i = tty.windows.length - 1;
                if (tty.windows[i]) return tty.windows[i].highlight();
            }

            return this.window.highlight();
        });

        this.on('request paste', function(key) {
            this.socket.emit('request paste', function(err, text) {
                if (err) return;
                self.send(text);
            });
        });

        this.on('request create', function() {
            this.window.createTab();
        });

        this.on('request term', function(key) {
            if (this.window.tabs[key]) {
                this.window.tabs[key].focus();
            }
        });

        this.on('request term next', function(key) {
            this.window.nextTab();
        });

        this.on('request term previous', function(key) {
            this.window.previousTab();
        });
    };

    Tab.prototype._ignoreNext = function() {
        // Don't send the next key.
        var handler = this.handler;
        this.handler = function() {
            this.handler = handler;
        };
        var showCursor = this.showCursor;
        this.showCursor = function() {
            this.showCursor = showCursor;
        };
    };

    /**
     * Program-specific Features
     */

    Tab.scrollable = {
        irssi: true,
        man: true,
        less: true,
        htop: true,
        top: true,
        w3m: true,
        lynx: true,
        mocp: true
    };

    Tab.prototype._bindMouse = Tab.prototype.bindMouse;

    Tab.prototype.bindMouse = function() {
        if (!Terminal.programFeatures) return this._bindMouse();

        var self = this;

        var wheelEvent = 'onmousewheel' in window ?
            'mousewheel' :
            'DOMMouseScroll';

        on(self.element, wheelEvent, function(ev) {
            if (self.mouseEvents) return;
            if (!Tab.scrollable[self.process]) return;

            if ((ev.type === 'mousewheel' && ev.wheelDeltaY > 0) ||
                (ev.type === 'DOMMouseScroll' && ev.detail < 0)) {
                // page up
                self.keyDown({ keyCode: 33 });
            } else {
                // page down
                self.keyDown({ keyCode: 34 });
            }

            return cancel(ev);
        });

        return this._bindMouse();
    };

    Tab.prototype.pollProcessName = function(func) {
        var self = this;
        this.socket.emit('process', this.id, function(err, name) {
            if (err) return func && func(err);
            // self.setProcessName(name);
            return func && func(null, name);
        });
    };

    Tab.prototype.setProcessName = function(name) {
        name = sanitize(name);

        if (this.process !== name) {
            this.emit('process', name);
        }

        this.process = name;
        this.btnClose.title = name;

        if (this.window.focused === this) {
            // if (this.title) {
            //   name += ' (' + this.title + ')';
            // }
            this.window.title.innerHTML = name;
        }
    };

    /**
     * Helpers
     */

    function indexOf(obj, el) {
        var i = obj.length;
        while (i--) {
            if (obj[i] === el) return i;
        }
        return -1;
    }

    function splice(obj, el) {
        var i = indexOf(obj, el);
        if (~i) obj.splice(i, 1);
    }

    function sanitize(text) {
        if (!text) return '';
        return (text + '').replace(/[&<>]/g, '')
    }

    /**
     * Load
     */

    function load() {
        if (load.done) return;
        load.done = true;

        off(document, 'load', load);
        off(document, 'DOMContentLoaded', load);
        tty.open();
    }

    on(document, 'load', load);
    on(document, 'DOMContentLoaded', load);
    setTimeout(load, 200);

    /**
     * Expose
     */

    tty.Window = Window;
    tty.Tab = Tab;
    tty.Terminal = Terminal;

    this.tty = tty;

}).call(function() {
    return this || (typeof window !== 'undefined' ? window : global);
}());