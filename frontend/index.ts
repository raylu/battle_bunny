import {DisplayMode, Engine, Random, TileMap, vec} from 'excalibur';

import {loader} from './loader';
import {sndPlugin} from './sounds';
import {spellSlots} from './spells';
import {piggyAnims, redWitchAnims, terrainGrass} from './sprites';
import {Unit} from './unit';

const game = new Engine({
	canvasElement: document.querySelector('canvas#game') as HTMLCanvasElement,
	resolution: {width: 512, height: 640}, // must be a multiple of referenceGrassSprite.width (64)
	displayMode: DisplayMode.FitContainer,
	pixelArt: true,
	suppressConsoleBootMessage: true,
});

const referenceGrassSprite = terrainGrass.getSprite(0, 0);
const background = new TileMap({
	rows: game.drawHeight / referenceGrassSprite.height,
	columns: game.drawWidth / referenceGrassSprite.width,
	tileHeight: referenceGrassSprite.height,
	tileWidth: referenceGrassSprite.width,
});
const random = new Random();
for (const tile of background.tiles)
	tile.addGraphic(terrainGrass.getSprite(random.integer(0, 3), random.integer(0, 1)));
game.add(background);

const redWitch = new Unit({
	pos: vec(64, 200),
	offset: vec(0, 2),
	scale: vec(1.5, 1.5),
	height: 48,
	width: 24,
}, {
	maxHP: 40,
	animations: redWitchAnims,
	spellSlots: spellSlots.redWitch,
});
redWitch.animations.takeDamage.events.on('end', () => {
	redWitch.graphics.use(redWitch.animations.idle);
});
game.add(redWitch);
const dialpad = document.querySelector('.dialpad') as HTMLDivElement;
for (const [dir, vel] of Object.entries({
	up: vec(0, -100),
	down: vec(0, 100),
	left: vec(-100, 0),
	right: vec(100, 0),
} as const)) {
	const button = dialpad.querySelector('.' + dir) as HTMLElement;
	const handler = (event: Event) => {
		event.preventDefault(); // don't propogate touch event to click
		redWitch.motion.vel = vel;
	};
	button.addEventListener('mousedown', handler);
	button.addEventListener('touchstart', handler);
}
const stop = () => redWitch.motion.vel = vec(0, 0);
for (const eventName of ['mouseup', 'touchend', 'touchcancel'])
	window.addEventListener(eventName, stop);

function makePiggy() {
	const piggy = new Unit({
		pos: vec(480, 200),
		scale: vec(2, 2),
		width: 19,
		height: 18,
	}, {
		maxHP: 20,
		animations: {...piggyAnims, charge: piggyAnims.idle, takeDamage: piggyAnims.idle},
		spellSlots: [],
	});
	piggy.graphics.flipHorizontal = true;
	game.add(piggy);
}
makePiggy();

await game.start(loader);
dialpad.style.display = 'flex';
