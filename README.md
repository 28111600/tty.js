# tty.js

A terminal in your browser using node.js and socket.io. Based on Fabrice
Bellard's vt100 for [jslinux](http://bellard.org/jslinux/).

For the standalone web terminal, see
[**term.js**](https://github.com/chjj/term.js).

For the lowlevel terminal spawner, see
[**pty.js**](https://github.com/chjj/pty.js).

## Features

- Tabs, Stacking Windows, Maximizable Terminals
- Screen/Tmux-like keys (optional)
- Ability to efficiently render programs: vim, mc, irssi, vifm, etc.
- Support for xterm mouse events
- 256 color support
- Persistent sessions

## Install

``` bash
$ git clone ~
$ npm install
```

## Usage

``` bash
$ sudo node index.js 
```

## TERM

The main goal of tty.js is to eventually write a full xterm emulator.
This goal has almost been reached, but there are a few control sequences
not implemented fully. `TERM` should render everything fine when set to
`xterm`.

## Contribution and License Agreement

If you contribute code to this project, you are implicitly allowing your code
to be distributed under the MIT license. You are also implicitly verifying that
all code is your original work. `</legalese>`

## License

Copyright (c) 2012-2017, Christopher Jeffrey (MIT License)

[1]: http://invisible-island.net/xterm/ctlseqs/ctlseqs.html#Mouse%20Tracking
