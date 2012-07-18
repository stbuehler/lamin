
var Mine = function() {
	var ALIVE = 0, LOST = 1, ABORTED = 2, WON = 3;
	
	function repeat(str, n) {
		return new Array(n+1).join(str);
	}
	
	function Mine(map) {
		this.parse(map)
	};
	Mine.ALIVE = ALIVE;
	Mine.LOST = LOST;
	Mine.ABORTED = ABORTED;
	Mine.WON = WON;

	Mine.prototype.parse = function(map) {
		var lines, i, width, height, pair, x, line;
		this.orig_map = map;
		lines = map.split(/\r\n?|\r?\n/);
		
		width = 0;
		height = lines.length;
		for (i = 0; i < lines.length; ++i) {
			if (0 == lines[i].length) {
				height = i;
				lines.splice(i, 1);
				break;
			}
			width = Math.max(width, lines[i].length);
		}
		this.height = height;
		this.width = width;
		this.map = map = lines.splice(0, height).reverse();
		this.lambdas = 0;
		this.found_lambdas = 0;
		this.moves = 0;
		this.score = 0;
		this.moves_below_water = 0;
		this.water = {
			level: 0,
			flooding: 0,
			proof: 10
		};
		
		this.lift = this.robot = false;
		this.trampoline = {
			sources: { }, // x, y and target
			targets: { }  // x, y and sources
		};
		this.beard = {
			growth: 25,
			razors: 0
		};
		map.splice(height, 0, repeat('#', width));
		map.splice(0, 0, repeat('#', width), repeat('#', width));
		height = height + 3;
		width = width + 2;
		for (i = 0; i < height; ++i) {
			// padding
			if (map[i].length < width-2) map[i] += repeat(' ', width - map[i].length - 2);
			// extra # padding:
			map[i] = '#' + map[i] + '#';
			line = map[i] = map[i].split('');
			
			// scan
			for (x = 0; x < width; ++x) {
				switch (line[x]) {
				case ' ':
				case '*':
				case '#':
				case '.':
				case 'W':
				case '!':
					break;
				case '@':
				case '\\':
					this.lambdas++;
					break;
				case 'L':
					if (this.lift !== false) throw "Only one lift is allowed";
					this.lift = { x: x, y: i };
					break;
				case 'R':
					if (this.robot !== false) throw "Only one robot is allowed";
					this.robot = { x: x, y: i };
					break;
				default:
					if (line[x] >= 'A' && line[x] <= 'I') {
						if (this.trampoline.sources[line[x]]) throw "Can have only one trampoline " + line[x];
						this.trampoline.sources[line[x]] = { x: x, y: i, target: false };
						this.trampoline.fromSources
					} else if (line[x] >= '1' && line[x] <= '9') {
						if (this.trampoline.targets[line[x]]) throw "Can have only one trampoline target " + line[x];
						this.trampoline.targets[line[x]] = { x: x, y: i, sources: [] };
					} else {
						throw "Invalid character in map: '" + line[x] + "'" + x;
					}
					break;
				}
			}
		}
		
		// if (this.lift === false) throw "Need a lift";
		if (this.robot === false) throw "Need a robot";
		
		// meta data
		this.meta = {};
		for (i = 0; i < lines.length; ++i) {
			if (0 == lines[i].length) continue;
			var words = lines[i].split(/ +/);
			switch (words[0]) {
			case 'Water':
				this.water.level = parseInt(words[1]);
				break;
			case 'Flooding':
				this.water.flooding = parseInt(words[1]);
				break;
			case 'Waterproof':
				this.water.proof = parseInt(words[1]);
				break;
			case 'Trampoline':
				if (words.length !== 4 || words[2] !== 'targets') 
					throw "Invalid trampoline: '" + words.join(" ") +"'";
				if (words[1].length != 1 || words[1] < 'A' || words[1] > 'I')
					throw "Invalid trampoline source '" + words[1] +"'";
				if (words[3].length != 1 || words[3] < '1' || words[3] > '9')
					throw "Invalid trampoline target '" + words[3] +"'";
				if (!this.trampoline.sources[words[1]]) throw "Trampoline " + words[1] + " not defined";
				if (!this.trampoline.targets[words[3]]) throw "Trampoline target " + words[3] + " not defined";
				if (this.trampoline.sources[words[1]].target) throw "Trampoline " + words[1] + " already has a target";
				this.trampoline.sources[words[1]].target = words[3];
				this.trampoline.targets[words[3]].sources.push(words[1]);
				break;
			case 'Growth':
				this.beard.growth = parseInt(words[1]);
				break;
			case 'Razors':
				this.beard.razors = parseInt(words[1]);
				break;
			default:
				this.meta[words[0]] = words.splice(1).join(" ");
				break;
			}
		}
		for (i in this.trampoline.sources) {
			if (this.trampoline.sources.hasOwnProperty(i)) {
				if (!this.trampoline.sources[i].target) throw "Trampoline " + i + " has no target";
			}
		}
		for (i in this.trampoline.targets) {
			if (this.trampoline.targets.hasOwnProperty(i)) {
				if (0 == this.trampoline.targets[i].sources.length) throw "Trampoline target " + i + " has no sources";
			}
		}
		this.water_level = this.water.level;
		this.razors = this.beard.razors;
		this.state = ALIVE;
	};
	
	Mine.prototype.get = function (x, y) {
		if (x < 0 || y < 0 || x >= this.width || y >= this.height) return '#';
		return this.map[y][x];
	}
	
	Mine.prototype.validMove = function (command) {
		if (this.state != ALIVE) return false;
		var n, c;
		command = command.toUpperCase();
		switch (command) {
		case 'L':
		case 'R':
			n = (command == 'L' ? -1 : 1);
			c = this.map[this.robot.y][this.robot.x+n];
			switch (c) {
			case '#': return false;
			case ' ':
			case '.':
			case '!':
			case '\\': return true;
			case 'L': return false;
			case 'O': return true;
			case '*':
			case '@':
				if (' ' == this.map[this.robot.y][this.robot.x+2*n]) return true;
			default:
				if (this.trampoline.sources.hasOwnProperty(c)) return true;
				break;
			}
			break;
		case 'U':
		case 'D':
			n = (command == 'D' ? -1 : 1);
			c = this.map[this.robot.y+n][this.robot.x];
			switch (c) {
			case '#': return false;
			case ' ':
			case '.':
			case '!':
			case '\\': return true;
			case 'L': return false;
			case 'O': return true;
			case '*': return false;
			case '@': return false;
			default:
				if (this.trampoline.sources.hasOwnProperty(c)) return true;
				break;
			}
			break;
		case 'W':
		case 'S':
			return this.razors > 0;
		case 'A':
			return true;
		}
		return false;
	};
	
	Mine.prototype.move = function(command) {
		if (this.state != ALIVE) return false;
		var n, c, s, t;
		var newMap, x, y, i, j, below, map = this.map, growBeard;
		command = command.toUpperCase();
		if (this.validMove(command)) {
			switch (command.toUpperCase()) {
			case 'L':
			case 'R':
				n = (command == 'L' ? -1 : 1);
				map[this.robot.y][this.robot.x] = ' ';
				c = map[this.robot.y][this.robot.x+n];
				switch (c) {
				case '*':
				case '@':
					map[this.robot.y][this.robot.x+2*n] = c;
					break;
				case '\\':
					this.lambdas--;
					this.found_lambdas++;
					break;
				case '!':
					this.razors++;
					break;
				case 'O':
					this._foundLift();
					break;
				default:
					if (this.trampoline.sources.hasOwnProperty(c)) {
						s = this.trampoline.sources[c];
						t = this.trampoline.targets[s.target];
						for (n = 0; n < t.sources.length; ++n) {
							s = this.trampoline.sources[t.sources[n]];
							map[s.y][s.x] = ' ';
						}
						this.robot.x = t.x;
						this.robot.y = t.y;
						n = 0;
					}
				}
				this.robot.x += n;
				map[this.robot.y][this.robot.x] = 'R';
				break;
			case 'U':
			case 'D':
				n = (command == 'D' ? -1 : 1);
				map[this.robot.y][this.robot.x] = ' ';
				c = map[this.robot.y+n][this.robot.x];
				switch (c) {
				case '\\':
					this.lambdas--;
					this.found_lambdas++;
					break;
				case '!':
					this.razors++;
					break;
				case 'O':
					this._foundLift();
					break;
				default:
					if (this.trampoline.sources.hasOwnProperty(c)) {
						s = this.trampoline.sources[c];
						t = this.trampoline.targets[s.target];
						for (n = 0; n < t.sources.length; ++n) {
							s = this.trampoline.sources[t.sources[n]];
							map[s.y][s.x] = ' ';
						}
						this.robot.x = t.x;
						this.robot.y = t.y;
						n = 0;
					}
				}
				this.robot.y += n;
				map[this.robot.y][this.robot.x] = 'R';
				break;
			case 'S':
				--this.razors;
				for (var i = -1; i <= 1; ++i) for (var j = -1; j <= 1; ++j) {
					if ('W' == map[this.robot.y+i][this.robot.x+j]) map[this.robot.y+i][this.robot.x+j] = ' ';
				}
				break;
			case 'A':
				this._abort();
				return;
			}
		}
		this.moves++;
		if (0 == this.lambdas) {
			if (false !== this.lift) {
				/* skip 'L' == this.map[this.lift.y][this.lift.x] - official validator replaces
				 * 'R' with 'O' after the last move too
				 */
				this.map[this.lift.y][this.lift.x] = 'O';
			}
		}
		
		newMap = [];
		growBeard = false;
		if (this.beard.growth > 0 && 0 == (this.moves % this.beard.growth)) {
			growBeard = true;
		}
		for (y = 0; y < map.length; ++y) { newMap[y] = this.map[y].slice(); }
		
		for (y = 2; y < 2+this.height; ++y) {
			for (x = 1; x <= this.width; ++x) {
				c = map[y][x];
				if ('*' === c || '@' === c) {
					below = map[y-1][x];
					if (' ' === below) {
						// fall down
						newMap[y-1][x] = c;
						if ('@' === c && ' ' != map[y-2][x]) newMap[y-1][x] = '\\';
						newMap[y][x] = ' ';
						if ('R' === map[y-2][x]) this._crushed();
					} else if ((below === '*' || below === '\\' || below === '@') && ' ' === map[y-1][x+1] && ' ' === map[y][x+1]) {
						// fall right
						newMap[y-1][x+1] = c;
						if ('@' === c && ' ' != map[y-2][x+1]) newMap[y-1][x+1] = '\\';
						newMap[y][x] = ' ';
						if ('R' == map[y-2][x+1]) this._crushed();
					} else if ((below === '*' || below === '@') && ' ' === map[y-1][x-1] && ' ' === map[y][x-1]) {
						// fall left
						newMap[y-1][x-1] = c;
						if ('@' === c && ' ' != map[y-2][x-1]) newMap[y-1][x-1] = '\\';
						newMap[y][x] = ' ';
						if ('R' == map[y-2][x-1]) this._crushed();
					}
				} else if (growBeard && 'W' === c) {
					for (i = -1; i <= 1; ++i) for (j = -1; j <= 1; ++j) {
						if (' ' === map[y+i][x+j]) newMap[y+i][x+j] = 'W';
					}
				}
			}
		}
		this.map = newMap;
		
		if (this.robot.y < this.water_level + 2) {
			this.moves_below_water++;
			if (this.moves_below_water > this.water.proof) this._drown();
		} else {
			this.moves_below_water = 0;
		}
		if (this.water.flooding > 0 && 0 == (this.moves % this.water.flooding)) {
			++this.water_level;
		}
		
		switch (this.state) {
		case LOST:
			this.score = 25*this.found_lambdas - this.moves;
			break;
		case WON:
			this.score = 75*this.found_lambdas - this.moves;
			break;
		case ALIVE:
		case ABORTED:
			this.score = 50*this.found_lambdas - this.moves;
			break;
		}
	};

	Mine.prototype._drown = function() {
		if (this.state < LOST) {
			this.state = LOST;
			this.reason = "Drowned";
		}
	};
	
	Mine.prototype._crushed = function() {
		if (this.state < LOST) {
			this.state = LOST;
			this.reason = "Crushed by rock";
		}
	};
	
	Mine.prototype._foundLift = function() {
		if (this.state < WON) {
			this.state = WON;
			this.reason = "Found lift";
		}
	};
	
	Mine.prototype._abort = function() {
		if (this.state < ABORTED) {
			this.state = ABORTED;
			this.reason = "Aborted";
		}
	};
	
	Mine.prototype.getMap = function() {
		return this.map.slice(2,-1).map(function(l) { return l.slice(1,-1); }).reverse();
	};
	
	Mine.prototype.toString = function() {
		return this.map.slice(2,-1).map(function(l) { return l.slice(1,-1).join(''); }).reverse().join("\n");
	};

	Mine.prototype.metaText = function() {
		var k, keys = [], lines = [];
		if (this.water.level != 0) lines.push("Water " + this.water.level);
		if (this.water.flooding != 0) lines.push("Flooding " + this.water.flooding);
		if (this.water.proof != 10) lines.push("Waterproof " + this.water.proof);
		for (k in this.trampoline.sources) {
			if (this.trampoline.sources.hasOwnProperty(k)) keys.push(k);
		}
		keys.sort();
		for (k = 0; k < keys.length; ++k) {
			lines.push("Trampoline " + keys[k] + " targets " + this.trampoline.sources[keys[k]].target);
		}
		if (this.beard.growth != 25) lines.push("Growth " + this.beard.growth);
		if (this.beard.razors != 0) lines.push("Razors " + this.beard.razors);
		
		keys = [];
		for (k in this.meta) {
			if (this.meta.hasOwnProperty(k)) keys.push(k);
		}
		keys.sort();
		for (k = 0; k < keys.length; ++k) {
			lines.push( keys[k] + " " + this.meta[keys[k]]);
		}
		return lines.join("\n");
	};
	
	return Mine;
}();

if (typeof exports !== "undefined") {
	exports.Mine = Mine;
}
