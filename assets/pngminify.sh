#!/bin/bash

set -e

if [ "x$1" == "x" -o "x$2" == "x" ]; then
	echo "Syntax: $0 [source] [dest]" >&2
	echo "   dest can be the same as source" >&2
	exit 1
fi

tdir=$(mktemp -d)

cleanup() {
	rm -rf "$tmpdir"
}

trap 'cleanup' INT TERM EXIT

pngcrush -q -rem alla "$1" "$tdir/crushed.png"
optipng -o9 -quiet "$tdir/crushed.png"
mv "$tdir/crushed.png" "$2"
