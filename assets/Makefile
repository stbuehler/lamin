
MAPS=
MAPS+=$(wildcard maps/full*.map)
MAPS+=$(wildcard maps/lightning*.map)
MAPS+=$(wildcard maps/horock*.map)
MAPS+=$(wildcard maps/beard*.map)
MAPS+=$(wildcard maps/trampoline*.map)
MAPS+=$(wildcard maps/flood*.map)
MAPS+=$(wildcard maps/contest?.map maps/contest10.map)
MAPS+=maps/identity.map
MAPS+=$(wildcard maps/ems*.map)
MAPS+=maps/pacman.map maps/pacman2.map
MAPS+=$(wildcard maps/bhickey*.map)

PNGS=$(patsubst large/%.png,%.png,$(wildcard large/*.png)) $(patsubst small/%.png,%.png,$(wildcard small/*.png))


all: maps.js sprite.png $(PNGS)

maps.js: FORCE
	./mapsToJson.js $(MAPS) > maps.js.new
	@if test ! -e maps.js || ! diff maps.js maps.js.new > /dev/null; then echo "new maps"; mv maps.js.new maps.js; else rm maps.js.new; fi

SPRITES=earth.png empty.png lambda.png lift.png openlift.png miner.png rock.png bricks.png
SPRITES+=trampolineA.png trampolineB.png trampolineC.png trampolineD.png trampolineE.png trampolineF.png trampolineG.png trampolineH.png trampolineI.png
SPRITES+=target1.png target2.png target3.png target4.png target5.png target6.png target7.png target8.png target9.png
SPRITES+=beard.png razor.png deadminer.png minerlift.png horock.png

sprite.png: $(SPRITES)
	convert -background "#000000" -append $(SPRITES) sprite.png
	./pngminify.sh sprite.png sprite.png

%.png: large/%.png
	cp $< $@
	./pngminify.sh $@ $@

%.png: small/%.png
	convert -size 64x64 -adaptive-resize 400% $< $@
	./pngminify.sh $@ $@

clean:
	rm -f maps.js sprites.png $(PNGS)

.PHONY: all clean FORCE
