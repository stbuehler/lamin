
enyo.kind({
	name: "lamin.center",
	kind: "enyo.Control",

	fit: true,
	tag: "table",
	components: [
		{ name:"row", kind: "enyo.Control", tag: "tr", fit: true, components: [
			{name:"cell", kind: "enyo.Control", tag: "td", fit: true, components: [{name:"client"}]}
		]}
	],

	createChrome: function() {
		this.inherited(arguments);
	},

	rendered: function() {
		this.inherited(arguments);
		this.applyStyle("border-spacing", "0px");
		this.applyStyle("border-collapse", "collapse");
		this.$.cell.applyStyle("text-align", "center");
		this.$.client.applyStyle("margin-left", "auto");
		this.$.client.applyStyle("margin-right", "auto");
 		this.$.client.applyStyle("text-align", "left");
		this.$.client.applyStyle("vertical-align", "middle");
		this.$.client.applyStyle("display", "inline-block");
	}
});

enyo.kind({
	name: "lamin.Sprite",
	kind: "enyo.Control",
	tag: "canvas",

	published: {
		type: ' ',
		state: '',
		wet: false
	},

	events: {
		onLoad:""
	},

	statics: {
		spriteSrc: 'assets/sprite.png',
		offsetMapNormal: ". \\LOR*#ABCDEFGHI123456789W!\0\0@",
		offsetMapLost  : ". \\LO\0*#ABCDEFGHI123456789W!R\0@",
		offsetMapWon   : ". \\L\0R*#ABCDEFGHI123456789W!\0O@"
	},

	create: function() {
		this.inherited(arguments);
		this.sprite_loaded = false;
		this.sprite = new Image();
		this.sprite.onload = function() {
			this.sprite_loaded = true;
			this.update();
			window.setTimeout(this.doLoad.bind(this), 0);
		}.bind(this);
		this.sprite.onerror = function(error) {
			console.log("sprite load error", error);
		};
		this.sprite.src = lamin.Sprite.spriteSrc;

		this.offsetsNormal = this._extractOffsets(lamin.Sprite.offsetMapNormal);
		this.offsetsLost = this._extractOffsets(lamin.Sprite.offsetMapLost);
		this.offsetsWon = this._extractOffsets(lamin.Sprite.offsetMapWon);
	},

	_extractOffsets: function(offsetMap) {
		var offsets = {}, i;
		for (i = 0; i < offsetMap.length; ++i) {
			offsets[offsetMap[i]] = i;
		}
		return offsets;
	},

	rendered: function() {
		this.inherited(arguments);
		this.update();
	},

	typeChanged: function() { this.update(); },
	stateChanged: function() { this.update(); },
	wetChanged: function() { this.update(); },

	update: function() {
		var c = this.hasNode(), s = this.get(this.type, this.state);
		if (!c || !s) return;

		var ctx = c.getContext('2d');
		ctx.save();
		ctx.fillStyle = '#EAEAEA';
		ctx.fillRect(0, 0, c.width, c.height);

		ctx.drawImage(s.image, s.x, s.y, s.w, s.h, 0, 0, c.width, c.height);

		if (this.wet) {
			ctx.fillStyle = "#0000FF";
			ctx.globalAlpha = 0.3;
			ctx.fillRect(0, 0, c.width, c.height);
		}
		ctx.restore();
	},

	getState: function(state) {
		if (!this.sprite_loaded) return;
		var offsets = this.offsetsNormal;
		switch (state) {
		case 'lost':
		case Mine.LOST:
			offsets = this.offsetsLost;
			break;
		case 'won':
		case Mine.WON:
			offsets = this.offsetsWon;
			break;
		}
		return { image: this.sprite, offsets: offsets, size: 64 };
	},

	get: function(type, state) {
		if (!this.sprite_loaded) return;
		var s = this.getState(state);
		return { image: this.sprite, x: 0, y: s.size*s.offsets[type], w: s.size, h: s.size };
	},

});

enyo.kind({
	name: "lamin.SpriteImage",
	kind: "enyo.Control",

	tag: "img",

	published: {
		size: 32,
		type: ' '
	},

	create: function () {
		this.inherited(arguments);
		this.sizeChanged();
		this.typeChanged();
	},

	rendered: function() {
		this.inherited(arguments);
		this.typeChanged();
	},

	sizeChanged: function() {
		this.setBounds({width: this.size, height: this.size}, "px");
	},

	typeName: function(type) {
		if (type >= 'A' && type <= 'I') return 'trampoline' + type;
		if (type >= '1' && type <= '9') return 'target' + type;
		switch (type) {
// 			". \\LOR*#ABCDEFGHI123456789W!\0\0@"
		case '.': return 'earth';
		case ' ': return 'empty';
		case '\\': return 'lambda';
		case 'L': return 'lift';
		case 'O': return 'openlift';
		case '*': return 'rock';
		case '#': return 'wall';
		case 'W': return 'beard';
		case '!': return 'razor';
		case '@': return 'hirock';
		}
		return type;
	},

	typeChanged: function() {
		this.setAttribute('src', 'assets/' + this.typeName(this.type) + '.png');
	}
});

enyo.kind({
	name: "lamin.Canvas",
	kind: "enyo.Control",

	tag: "canvas",

	published: {
		mine: false,
		boundWidth: 0,
		boundHeight: 0
	},

	components: [
		{ name: "sprite", kind: "lamin.Sprite", onLoad: "onSpriteLoad" }
	],

	events: {
		onSizeChanged: "",
		onTileTap: ""
	},

	create: function() {
		this.inherited(arguments);
		this.tileSize = 32;
	},

	gridCoords: function(event) {
		var totalOffsetX = 0;
		var totalOffsetY = 0;

		for (var e = this.hasNode(); e; e = e.offsetParent) {
			totalOffsetX += e.offsetLeft;
			totalOffsetY += e.offsetTop;
		}

		var X = -0.5 + ((event.pageX - totalOffsetX) / this.tileSize);
		var Y = -0.5 + ((event.pageY - totalOffsetY) / this.tileSize);

		return { x: X, y: this.mine.height - Y - 1 };
	},

	tap: function(sender, event) {
		var coords = this.gridCoords(event);
		event.tileXf = coords.x;
		event.tileYf = coords.y;
		event.tileX = Math.round(coords.x);
		event.tileY = Math.round(coords.y);
		this.doTileTap(event);
		this.inherited(arguments);
	},

	onSpriteLoad: function() {
		this.update();
	},

	rendered: function() {
		this.inherited(arguments);
		this.$.sprite.hide();
		this.update();
	},

	mineChanged: function() {
		this.update();
	},

	boundWidthChanged: function() { this.recalcTileSize() },
	boundHeightChanged: function() { this.recalcTileSize() },

	recalcTileSize: function() {
		var tsize = this.tileSize;
		this._updateSize();
		if (tsize !== this.tileSize) this.update();
	},

	_updateSize: function() {
		var mine = this.mine, n = this.hasNode();

		var tsize = 64;
		if (mine.width !== 0 && mine.height !== 0) {
			if (this.boundWidth) tsize = Math.min(this.boundWidth / mine.width, tsize);
			if (this.boundHeight) tsize = Math.min(this.boundHeight / mine.height, tsize);
		}
		tsize = Math.max(16, Math.floor(tsize));
		this.tileSize = tsize;

		var w = mine.width * tsize, h = mine.height * tsize;
		if (n.width !== w || n.height !== h) {
			this.setAttribute("width", w);
			this.setAttribute("height", h);
			this.doSizeChanged({width: w, height: h});
		}
	},

	update: function() {
		var c = this.hasNode(), mine = this.mine, s = this.$.sprite.getState(mine.state);
		if (!c) return;
		if (false === mine || !s) {
			c.width = 0;
			c.height = 0;
			return;
		}
		var map = mine.getMap();
		this._updateSize();
		var tsize = this.tileSize;

		var waterLevel = Math.max(mine.water_level, 0);

		var ctx = c.getContext('2d');
		ctx.save();
		ctx.fillStyle = 'black';
		ctx.fillRect(0, 0, c.width, c.height);

		var x, y;

		for (y = 0; y < mine.height; ++y) {
			for (x = 0; x < mine.width; ++x) {
				ctx.drawImage(s.image, 0, s.offsets[map[y][x]] * s.size, s.size, s.size, tsize*x, tsize*y, tsize, tsize);
			}
		}

		ctx.fillStyle = "#0000FF";
		ctx.globalAlpha = 0.3;
		y = tsize*(mine.height - waterLevel);
		ctx.fillRect(0, y, c.width, c.height-y);
		ctx.restore();
	}
});

enyo.kind({
	name: "lamin.Game",

	classes: "enyo-arranger-fit enyo-fit",
	fit: true,
	kind: "enyo.FittableRows",

	published: {
		// gets loaded from global mineMaps
		level:  {map:''}
	},

	events: {
		onMineChanged: ""
	},

	components: [
		{ kind: "lamin.center", fit: true, components: [ /*{ name: "wrapper", components: [*/
// 			{ kind: "enyo.FittableRows", components: [
// 				{ name: "movesDeco", kind: "onyx.InputDecorator", layoutKind: "enyo.FittableColumnsLayout",  components: [
// 					{ content: "Moves: " },
// 					{ kind: "onyx.Input", name: "moves", placeholder:"No moves yet",value:"", fit: true, onkeydown: "onMovesKeyDown", oninput: "onMovesInput" },
// 					{ name: "moveCount", content: "&nbsp;0", allowHtml: true }
// 				] },
				{ kind: "enyo.FittableColumns", classes: "enyo-unselectable", noStretch: true, components: [
					{ kind: "enyo.FittableRows", style: "width: 80px;padding-right: 10px", components: [
						{ kind: "enyo.FittableColumns", components: [
							{ kind: "lamin.SpriteImage", type: 'star', size: 24 },
							{ name: "score", content: "0", style: "text-align: right;", fit: true }
						] },
						{ kind: "enyo.FittableColumns", components: [
							{ kind: "lamin.SpriteImage", type: '\\', size: 24 },
							{ name: "lambdas", content: "0/0", style: "text-align: right;", fit: true }
						] },
						{ name: "waterRow1", kind: "enyo.FittableColumns", components: [
							{ kind: "lamin.SpriteImage", type: 'minerwater', size: 24 },
							{ name: "underwater", content: "", style: "text-align: right;", fit: true }
						] },
						{ name: "waterRow2", kind: "enyo.FittableColumns", components: [
							{ kind: "lamin.SpriteImage", type: 'flooding', size: 24 },
							{ name: "flooding", content: "", style: "text-align: right;", fit: true }
						] },
						{ name: "beardRow1", kind: "enyo.FittableColumns", components: [
							{ kind: "lamin.SpriteImage", type: '!', size: 24 },
							{ name: "razors", content: "0", style: "text-align: right;", fit: true }
						] },
						{ name: "beardRow2", kind: "enyo.FittableColumns", components: [
							{ kind: "lamin.SpriteImage", type: 'W', size: 24 },
							{ name: "beard", content: "", style: "text-align: right;", fit: true }
						] }
					] },
					{ name: "canvas", kind: "lamin.Canvas", onSizeChanged: "onCanvasSizeChanged", onTileTap: "onCanvasTileTap" },
					{ name: "notrampolines", kind: "enyo.FittableRows", style: "width: 80px;padding-left: 10px", components: [
						{ kind: "enyo.FittableColumns", components: [
							{ content: "No", style: "width: 46px" }, // fit doesn't work here.
							{ kind: "lamin.SpriteImage", type: 'trampoline', size: 24 }
						] }
					] },
					{ name: "trampolines", kind: "enyo.FittableRows", style: "width: 80px;padding-left: 10px" }
				] }
// 			] }
		/*] }*/ ] },
		{ kind: "Signals", onkeydown: "handleKeydown" }
    ],

	statics: {
		validMoves: {L:1,U:1,R:1,D:1,W:1,S:1}
	},

	create: function() {
		this.inherited(arguments);
	},

	rendered: function() {
		this.inherited(arguments);
// 		this.$.moves.setValue(this.mine ? this.mine.moves : '');
	},

	levelChanged: function() {
		this.resetMoves();
	},

	_mineChanged: function() {
		this.$.canvas.update();
// 		var n = this.$.moves.hasNode();
// 		var atend = (n && n.selectionStart === this.$.moves.getValue().length);
// 		var inputHasFocus = document.activeElement === this.$.moves.hasNode();
// 		this.$.moves.setValue(this.mine.moves);
// 		if (atend && n.setSelectionRange) {
// 			n.setSelectionRange(this.mine.moves.length, this.mine.moves.length);
// 			if (!inputHasFocus) this.$.moves.hasNode().blur();
// 		}
		this.$.score.setContent(this.mine.score);
// 		this.$.moveCount.setContent("&nbsp;" + this.mine.moves.length);
		this.$.lambdas.setContent(this.mine.found_lambdas + "/" + (this.mine.lambdas+this.mine.found_lambdas));
		this.$.flooding.setContent(this.mine.water.flooding ? (this.mine.moves.length % this.mine.water.flooding) + "/" + this.mine.water.flooding : '');
		this.$.beard.setContent(this.mine.beard.growth ? (this.mine.moves.length % this.mine.beard.growth) + "/" + this.mine.beard.growth : '');
		this.$.underwater.setContent((this.mine.water.flooding || this.mine.water.level > 0) ? this.mine.moves_below_water + "/" + this.mine.water.proof : '');
		this.doMineChanged({mine: this.mine});
	},

	_addMoves: function(moves) {
		moves = moves.toUpperCase();
		var validMoves = lamin.Game.validMoves;
		for (var i = 0; i < moves.length; ++i) {
			if (this.mine.state != Mine.ALIVE) break;
			if (validMoves[moves[i]]) {
				this.mine.move(moves[i]);
			}
		}
	},
	addMoves: function(moves) {
		this._addMoves(moves);
		this._mineChanged();
	},

	reflow: function() {
		this.inherited(arguments);
		var b = this.getBounds();
		this.$.canvas.setBoundWidth(b.width - 240);
		this.$.canvas.setBoundHeight(b.height - 80);
	},

	onCanvasSizeChanged: function(sender, event) {
// 		this.$.wrapper.setBounds({width: event.width + 160}, "px");
// 		this.$.movesDeco.layout.reflow();
// 		this.reflow();
	},

	onCanvasTileTap: function(sender, event) {
// 		console.log("tapped: ", event.tileX, "/", event.tileY);
		var r = this.mine.getRobot();
		var dx = event.tileXf - r.x;
		var dy = event.tileYf - r.y;
		var ndx = dx ? dx > 0 ? 1 : -1 : 0;
		var ndy = dy ? dy > 0 ? 1 : -1 : 0;
		var m = dx ? Math.abs(dy/dx) : 100 /* "big" */;
// 		console.log("tapped: ", dx, dy, ndx, ndy, m);
		var gox, goy;
		if (0 == Math.round(dx) && 0 == Math.round(dy)) {
			return;
		}
		if (m < 0.38268343) {
			goy = 0; gox = ndx;
		} else if (m > 2.6131259) {
			gox = 0; goy = ndy;
		} else {
			gox = ndx; goy = ndy;
		}
		var cmd;
		if (this.mine.get(r.x + gox, r.y + goy) == 'W') {
			cmd = "S";
		} else {
			cmd = (m < 1) ? (ndx < 0 ? "L" : "R") : (ndy < 0 ? "D" : "U");
		}
		if (this.mine.validMove(cmd)) this.addMoves(cmd);
	},

	_resetMoves: function() {
		this.mine = new Mine(this.level.map);
		this.$.canvas.setMine(this.mine);

		var haveTrampolines = false;
		this.$.trampolines.destroyClientControls();
		var t = this.mine.trampoline;
		var ts = [];
		for (var k in t.sources) {
			if (t.sources.hasOwnProperty(k)) {
				haveTrampolines = true;
				ts.push(k);
			}
		}
		ts.sort();
		for (k = 0; k < ts.length; ++k) {
			this.$.trampolines.createComponent(
				{ kind: "enyo.FittableColumns", components: [
					{ kind: "lamin.SpriteImage", type: ts[k], size: 24 },
					{ kind: "lamin.SpriteImage", type: 'arrow', size: 22, style: "text-align:center;" },
					{ kind: "lamin.SpriteImage", type: t.sources[ts[k]].target, size: 24 }
				] }, { owner: this }
			);
		}
		if (haveTrampolines) {
			this.$.trampolines.show();
			this.$.trampolines.contentChanged();
			this.$.notrampolines.hide();
		} else {
			this.$.trampolines.hide();
			this.$.notrampolines.show();
		}

		this.$.waterRow1.setShowing(this.mine.water.active);
		this.$.waterRow2.setShowing(this.mine.water.active);
		this.$.beardRow1.setShowing(this.mine.beard.active);
		this.$.beardRow2.setShowing(this.mine.beard.active);
		this.resized();
	},
	resetMoves: function() {
		this._resetMoves();
		this._mineChanged();
	},

	undoMove: function() {
		this.mine.undo();
		this._mineChanged();
	},

	_handleKeydown: function(event) {
		if (event.ctrlKey || event.altKey || event.metaKey) return false;

		// ascii keys are reported as uppercase ascii code
		var cmd = String.fromCharCode(event.keyCode);
		if (this.mine.validMove(cmd)) {
			this.addMoves(cmd);
		} else if (cmd == 'C') { // clear
			this.resetMoves();
		} else switch (event.keyCode) {
		case 8: // backspace -> undo
			this.undoMove();
			break;
// 		case 13: // focus text field
// 			this.$.moves.focus();
// 			break;
		case 37: // cursor left
		case 74: // 'J'
			if (!this.mine.validMove('L')) break;
			this.addMoves('L');
			break;
		case 38: // cursor up
		case 73: // 'I'
			if (!this.mine.validMove('U')) break;
			this.addMoves('U');
			break;
		case 39: // cursor right
		case 76: // 'L'
			if (!this.mine.validMove('R')) break;
			this.addMoves('R');
			break;
		case 40: // cursor down
		case 75: // 'K'
			if (!this.mine.validMove('D')) break;
			this.addMoves('D');
			break;
		default:
			return false;
		}
		return true;
	},

	handleKeydown: function(sender, event) {
// 		console.log("key down: ", event);
		if (this._handleKeydown(event)) {
			event.preventDefault();
			event.stopPropagation();
		}
	},

	onMovesInput: function(sender, event) {
		var moves = this.$.moves.getValue();
		this._resetMoves();
		this.addMoves(moves.toUpperCase());
	},

	onMovesKeyDown: function(sender, event) {
// 		console.log("moves key down", event);
		if (event.ctrlKey || event.altKey || event.metaKey) return;
		if (event.keyCode === 13 || event.keyCode === 27) {
			event.preventDefault();
			event.stopPropagation();
			this.$.moves.hasNode().blur();
		}
	}
});

lamin.helpText = '\
<h3>Goal</h3>\
<p>The goal is to collect all lambdas <img src="assets/lambda.png" height="20" width="20"> with the miner <img src="assets/miner.png" height="20" width="20"><br>\
and reach the then open lift <img src="assets/openlift.png" height="20" width="20">.</p>\
<p>Don\'t let rocks fall on you (although you can catch and push them)<br>\
and don\'t drown in the rising water</p>\
<p>Collecting a lambda <img src="assets/lambda.png" height="20" width="20"> gives 50 points <img src="assets/star.png" height="20" width="20">, reaching the open lift gives 25<br>\
bonus points <img src="assets/star.png" height="20" width="20"> per collected lambda <img src="assets/lambda.png" height="20" width="20">, and dieing costs 25 points <img src="assets/star.png" height="20" width="20"> per lambda <img src="assets/lambda.png" height="20" width="20">;<br>\
also each move costs 1 point. Try to get the highest score possible!</p>\
<p>When you enter a trampoline <img src="assets/trampoline.png" height="20" width="20"> you will get teleported to the target <img src="assets/target.png" height="20" width="20">.<br>\
The mapping for multiple trampolines and targets is shown on the right side.</p>\
\
<table class="help-keys">\
<tr><th>Key</th><th>Action</th></tr>\
<tr><td class="help-key"><b>J</b>, <b>L</b> or <b>&larr;</b></td><td>Move left</td></tr>\
<tr><td class="help-key"><b>I</b>, <b>U</b> or <b>&uarr;</b></td><td>Move up</td></tr>\
<tr><td class="help-key"><b>L</b>, <b>R</b> or <b>&rarr;</b></td><td>Move right</td></tr>\
<tr><td class="help-key"><b>K</b>, <b>D</b> or <b>&darr;</b></td><td>Move down</td></tr>\
<tr><td class="help-key"><b>W</b></td><td>Wait</td></tr>\
<tr><td class="help-key"><b>S</b></td><td>Shave beards in the surrounding cells, costs 1 <img src="assets/razor.png" height="20" width="20"></td></tr>\
<tr><td class="help-key">Backspace</td><td>Undo last move</td></tr>\
<tr><td class="help-key"><b>C</b></td><td>Restart level</td></tr>\
<tr><td class="help-key">Page up/down</td><td>Select previous/next level</td></tr>\
</table>\
<br><br>\
This game is a result of the <a href="http://icfpcontest2012.wordpress.com/">ICFP Programming Contest 2012</a>.<br>\
\
The implementation was coded by Stefan B&uuml;hler in 2012, the images are based on the official ones.<br>\
Based on the <a href="http://enyojs.com/">Enyo</a> framework (+<a href="https://github.com/enyojs/layout">layout</a>+<a href="https://github.com/enyojs/onyx">onyx</a>).
';

lamin.rulesText = '\
<h3>Rules</h3>\
<p>The rules were defined for the <a href="http://icfpcontest2012.wordpress.com/task/">task</a> of implementing a solver<br>\
for the mazes for the <a href="http://icfpcontest2012.wordpress.com/">ICFP Programming Contest 2012</a>.<br>\
Here the basic task and the extension specifications:\
<ul>\
<li><a href="http://www-fp.cs.st-andrews.ac.uk/~icfppc/task.pdf">Task</a></li>\
<li><a href="http://www-fp.cs.st-andrews.ac.uk/~icfppc/weather.pdf">Weather</a></li>\
<li><a href="http://www-fp.cs.st-andrews.ac.uk/~icfppc/trampoline.pdf">Trampolines</a></li>\
<li><a href="http://www-fp.cs.st-andrews.ac.uk/~icfppc/beards.pdf">Beards and Razors</a></li>\
<li><a href="http://www-fp.cs.st-andrews.ac.uk/~icfppc/horocks.pdf">Higher Order Rocks</a></li>\
</ul>\
The story behind is certainly worth reading!\
<h3>Summary</h3>\
<ul>\
<li>Rocks <img src="assets/rock.png" height="20" width="20"> and higher order rocks <img src="assets/horock.png" height="20" width="20"> fall in empty space</li>\
<li><img src="assets/rock.png" height="20" width="20"> and <img src="assets/horock.png" height="20" width="20"> slide off each other if there is space in the same<br>\
row and in the one below; they prefer sliding to the right.</li>\
<li><img src="assets/rock.png" height="20" width="20"> and <img src="assets/horock.png" height="20" width="20"> slide down lambdas <img src="assets/lambda.png" height="20" width="20"> to the right</li>\
<li>If a <img src="assets/horock.png" height="20" width="20"> doesn\'t have a space below after falling or sliding it<br>\
breaks down into a <img src="assets/lambda.png" height="20" width="20"></li>\
<li><img src="assets/rock.png" height="20" width="20"> and <img src="assets/horock.png" height="20" width="20"> only fall or slide once after each move</li>\
<li>Beard <img src="assets/beard.png" height="20" width="20"> has a growth rate, displayed on the left side.<br>\
Once the counter hits the top, all beards grow into the<br>\
space around them</li>\
<li>The water level has a flooding <img src="assets/flooding.png" height="20" width="20"> property; similar to beard<br>\
growth the water level rises by one if the counter is full</li>\
<li>You can only stay under water for a limited amount of moves <img src="assets/minerwater.png" height="20" width="20"></li>\
<li>\
  In the update phase after a move the old state is copied to<br>\
  a new one. All checks (reads) are done against the old state,<br>\
  and writes to the new one.<br>\
  This means sometimes one updates overwrites another - like <br>\
  a <img src="assets/lambda.png" height="20" width="20"> from a <img src="assets/horock.png" height="20" width="20"> gets overwritten by <img src="assets/rock.png" height="20" width="20"> (or another <img src="assets/lambda.png" height="20" width="20">) and is lost.<br>\
  The update is done per cell in the order left to right, bottom to top.\
</li>\
<li>The miner can only:<br> \
  <ul>\
  <li>walk in empty space</li>\
  <li>dig earth <img src="assets/earth.png" height="20" width="20"></li>\
  <li>collect <img src="assets/lambda.png" height="20" width="20"> (but not <img src="assets/horock.png" height="20" width="20">)</li>\
  <li>collect razors <img src="assets/razor.png" height="20" width="20"></li>\
  <li>shave surrounding beard <img src="assets/beard.png" height="20" width="20"> (always costs 1 razor <img src="assets/razor.png" height="20" width="20">, if you<br>\
  have one, whether successful or not)</li>\
  <li>enter trampolines <img src="assets/trampoline.png" height="20" width="20"></li>\
  <li>push single rocks <img src="assets/rock.png" height="20" width="20"> and <img src="assets/horock.png" height="20" width="20"> horizontally</li>\
  <li>enter the open lift <img src="assets/openlift.png" height="20" width="20">, but not the closed lift <img src="assets/lift.png" height="20" width="20"></li>\
  </ul>\
<li>The miner always leaves space behind it</li>\
<li>If the miner enters a trampoline <img src="assets/trampoline.png" height="20" width="20">, the miner teleports to the<br>\
mapped target <img src="assets/target.png" height="20" width="20">. All trampolines <img src="assets/trampoline.png" height="20" width="20"> that map to this target are<br>\
removed.</li>\
<li>The lift <img src="assets/lift.png" height="20" width="20"> opens after a move if all lambdas were collected</li>\
</ul>\
';


enyo.kind({
	name: "lamin.Text",

	published: {
		text: ""
	},

	components: [
		{ kind: "enyo.Scroller", style: "height: 100%; width: 100%", horizontal: "hidden", vertical: "auto", touch: false, thumb: false, components: [
			{ style: "margin: 0 auto; text-align: center;", components: [
				{ name: "client", allowHtml: true, classes: "enyo-unselectable", style: "display: inline-block; text-align: left; padding-right: 10px;" }
			] }
		] }
	],

	create: function() {
		this.inherited(arguments);
		this.textChanged();
	},

	textChanged: function() {
		this.$.client.setContent(this.text);
	}
});

enyo.kind({
	name: "lamin.LevelInfo",

	published: {
		level: false,
		mine: false
	},

	components: [ { kind: "enyo.Scroller", style: "height: 100%; width: 100%", horizontal: "hidden", vertical: "auto", touch: false, thumb: false, components: [
		{ style: "margin: 0 auto; text-align: center;", components: [
			{ kind: "enyo.FittableRows", classes: "enyo-unselectable", style: "padding-right: 10px;", components: [
				{ content: "Level source", tag: "h3" },
				{ kind: "onyx.InputDecorator", components: [
					{ name: "levelSource", kind: "onyx.TextArea", onfocus: "onTextFocus" }
				]},
				{ content: "Current moves", tag: "h3" },
				{ kind: "onyx.InputDecorator", components: [
					{ name: "moves", kind: "onyx.TextArea", onfocus: "onTextFocus" }
				]},
				{ content: "Current state", tag: "h3" },
				{ kind: "onyx.InputDecorator", components: [
					{ name: "map", kind: "onyx.TextArea", onfocus: "onTextFocus" }
				]},
			] }
		] }
	] } ],

	create: function() {
		this.inherited(arguments);
	},

	rendered: function() {
		this.$.levelSource.setAttribute("readonly", "readonly");
		this.$.levelSource.setAttribute("cols", "80");
		this.$.levelSource.setAttribute("rows", "1");

		this.$.moves.setAttribute("readonly", "readonly");
		this.$.moves.setAttribute("cols", "80");
		this.$.moves.setAttribute("rows", "1");

		this.$.map.setAttribute("readonly", "readonly");
		this.$.map.setAttribute("cols", "80");
		this.$.map.setAttribute("rows", "1");

		this.levelChanged();
		this.mineChanged();
	},

	onTextFocus: function(sender, event) {
		var n = sender.hasNode();
		window.setTimeout(function() {
			// delay select, workaround http://code.google.com/p/chromium/issues/detail?id=32865
			n.select();
		}, 0);
	},

	levelChanged: function() {
		var txt = this.level ? this.level.map : '';
		txt = txt.replace(/\n*\Z/, '');
		this.$.levelSource.setValue(txt);
		this.$.levelSource.setAttribute("rows", txt.split('\n').length);
	},

	setMine: function(mine) {
		this.mine = mine;
		this.mineChanged(); // always trigger changed
	},

	mineChanged: function() {
		this.$.moves.setValue(this.mine ? this.mine.moves : '');
		this.$.map.setValue(this.mine ? this.mine.getMap().map(function(v) { return v.join(''); }).join('\n') : '');
		this.$.moves.setAttribute("rows", this.mine ? Math.max(1, Math.ceil(this.mine.moves.length / 80)) : 1);
		this.$.map.setAttribute("cols", this.mine ? this.mine.width : 1);
		this.$.map.setAttribute("rows", this.mine ? this.mine.height : 1);
	}
});

enyo.kind({
	name: "lamin.Main",

	classes: "onyx",

	fit: true,
	kind: "lamin.TabPanels",
	index: 0,
	
	components: [
		{ caption: "Play", name: "game", kind: "lamin.Game", onMineChanged: "handleMineChanged" },
		{ caption: "Level info", name: "info", kind: "lamin.LevelInfo" },
		{ caption: "Help", kind: "lamin.Text", text: lamin.helpText },
		{ caption: "Rules", kind: "lamin.Text", text: lamin.rulesText },

		{ kind: "Signals", onkeydown: "handleKeydown" }
	],

	tabComponents: [
		{ prepend: true, kind: "onyx.MenuDecorator", style: "padding: 0 5px", components: [
			{ name: "levelMenuTitle", content: "Level", style: "min-width: 180px" },
			{ kind: "onyx.Menu", name: "levelMenuPopup", floating: true, components: [
				{ name: "levelMenu", kind: "enyo.List", classes: "enyo-unselectable", maxHeight: "500px", touch: true, onSetupItem: "levelMenuSetupItem", components: [
					{name: "levelMenuItem", classes: "enyo-border-box", ontap: "levelMenuSelected"}
				] }
			] }
		] },
		{ kind: "onyx.Button", style: "margin: 5px", content: "Wait", ontap: "wait" },
		{ kind: "onyx.Button", style: "margin: 5px", content: "Undo", ontap: "undo" },
		{ kind: "onyx.Button", style: "margin: 5px", content: "Clear", ontap: "clear" }
	],

	published: {
		// gets loaded from global mineMaps
		levels: [],
		levelIndex: 0
	},

	create: function() {
		this.inherited(arguments);

		this.$.scroller.createComponents(this.tabComponents, { owner: this })

		// restore previous state on refresh from url fragment
		var fragment = window.location.hash.slice(1).split(';');
		var searchMap = fragment[0];
		var loadMoves = '';

		this.levelIndex = 0;
		var levels = this.levels = [];
		for (var k in mineMaps) {
			if (mineMaps.hasOwnProperty(k)) {
				if (k === searchMap) {
					this.levelIndex = levels.length;
					if (fragment.length > 1) loadMoves = fragment[1];
				}
				levels.push({name: k, map: mineMaps[k]});
			}
		}
		this.level = false;
		this.levelsChanged();
		this.fragmentUpdateTimer = false;

		if (loadMoves !== '') {
	// 		console.log("preset moves: " + loadMoves);
			this.$.game.addMoves(loadMoves);
		}
	},

	levelMenuSetupItem: function(sender, event) {
		this.$.levelMenuItem.setContent(this.levels[event.index].name);
// 		if (event.index == 0) console.log("setupItem", event.index, this.levelIndex, this.levelIndex === event.index);
		this.$.levelMenuItem.addRemoveClass("onyx-selected", this.levelIndex === event.index);
	},

	levelMenuSelected: function(sender, event) {
		this.$.levelMenuPopup.hide();
		var oldNdx = this.levelIndex;
		this.levelIndex = event.index;
		// bug, wtf?...
		this.$.levelMenu.renderRow(oldNdx);
		this.levelIndexChanged();
	},

	levelIndexChanged: function() {
		var level;
		if (this.levelIndex < 0 || this.levelIndex > this.levels.length) this.levelIndex = 0;
		level = this.levels[this.levelIndex];
		this.$.levelMenu.select(this.levelIndex);
		this.level = level;
		if (level) {
			this.$.game.setLevel(level);
			this.$.info.setLevel(level);
			this.$.levelMenuTitle.setContent("Level " + level.name);
		}
	},

	levelsChanged: function() {
		this.$.levelMenu.setCount(this.levels.length);
		this.$.levelMenu.reset();
		this.levelIndexChanged();
	},

	handleMineChanged: function(sender, event) {
		this.$.info.setMine(event.mine);
		if (false !== this.fragmentUpdateTimer) {
			window.clearTimeout(this.fragmentUpdateTimer);
		}
		var url = '#' + this.level.name + ';' + event.mine.moves;
		window.setTimeout(function() {
			this.fragmentUpdateTimer = false;
			location.replace(url);
		}.bind(this), 100);
	},

	undo: function() {
		this.$.game.undoMove();
	},

	clear: function() {
		this.$.game.resetMoves();
	},

	wait: function() {
		this.$.game.addMoves("W");
	},

	_handleKeydown: function(event) {
		if (event.ctrlKey || event.altKey || event.metaKey) return false;

		// ascii keys are reported as uppercase ascii code
		switch (event.keyCode) {
		case 33: // page up
			this.setLevelIndex(this.levelIndex - 1);
			break;
		case 34: // page down
			if (this.levelIndex+1 < this.levels.length) this.setLevelIndex(this.levelIndex + 1);
			break;
		default:
			return false;
		}
		return true;
	},

	handleKeydown: function(sender, event) {
// 		console.log("key down: ", event);
		if (this._handleKeydown(event)) {
			event.preventDefault();
			event.stopPropagation();
		}
	},

});
