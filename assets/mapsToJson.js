#!/usr/bin/env node

var fs = require('fs');
var path = require('path');

var i, map, maps = {}, fname;
for (i = 2; i < process.argv.length; ++i) {
	fname = process.argv[i];
	map = fs.readFileSync(fname, 'utf-8');
	maps[path.basename(fname, '.map')] = map;
}

process.stdout.write("var mineMaps = " + JSON.stringify(maps) + ";\n");
process.stdout.write('if (typeof exports !== "undefined") {exports.maps = mineMaps;}' + "\n");
