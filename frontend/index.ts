import {Actor, CollisionType, DisplayMode, Engine, Random, TileMap, vec, type CollisionStartEvent} from 'excalibur';

import {loader} from './loader';
import {sndPlugin} from './sounds';
import {piggyAnims, redWitchAnims, terrainGrass} from './sprites';
import {Unit} from './unit';

const game = new Engine({
	canvasElement: document.querySelector('canvas#game') as HTMLCanvasElement,
	resolution: {width: 512, height: 640}, // must be a multiple of referenceGrassSprite.width (64)
	suppressHiDPIScaling: true,
	displayMode: DisplayMode.FitContainer,
	pixelArt: true,
	antialiasing: false,
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
	collisionType: CollisionType.Active,
}, {
	maxHP: 40,
	animations: redWitchAnims,
});
redWitch.animations.takeDamage.events.on('end', () => {
	redWitch.graphics.use(redWitch.animations.idle);
});
game.add(redWitch);

const dialpad = document.querySelector('.dialpad') as HTMLDivElement;
function move(click: {clientX: number, clientY: number}) {
	const dpadRect = dialpad.getBoundingClientRect();
	const right = click.clientX - (dpadRect.left + dpadRect.width / 2);
	const down = click.clientY - (dpadRect.top + dpadRect.height / 2);
	redWitch.motion.vel = vec(right, down).normalize().scaleEqual(100);
}
function touchHandler(event: TouchEvent) {
	event.preventDefault(); // don't propogate touch event to click
	move(event.targetTouches[0]);
}
dialpad.addEventListener('touchstart', touchHandler);
dialpad.addEventListener('touchmove', touchHandler);
dialpad.addEventListener('mousedown', move);
dialpad.addEventListener('mousemove', (event: MouseEvent) => {
	event.preventDefault(); // don't scroll the page
	if (!redWitch.motion.vel.equals(vec(0, 0)))
		move(event);
});
const stop = () => redWitch.motion.vel = vec(0, 0);
for (const eventName of ['mouseup', 'touchend', 'touchcancel'])
	window.addEventListener(eventName, stop);

const leftWall = new Actor({
	height: game.drawHeight,
	width: 1,
	anchor: vec(0, 0),
	pos: vec(0, 0),
	collisionType: CollisionType.Fixed,
});
game.add(leftWall);

function makePiggy() {
	const piggy = new Unit({
		pos: vec(480, 200),
		scale: vec(2, 2),
		width: 19,
		height: 18,
		collisionType: CollisionType.Passive,
	}, {
		maxHP: 20,
		animations: {...piggyAnims, charge: piggyAnims.idle, takeDamage: piggyAnims.idle},
	});
	piggy.graphics.flipHorizontal = true;
	piggy.motion.vel.x = -100;
	piggy.on('collisionstart', (event: CollisionStartEvent) => {
		if (event.other.owner === leftWall)
			setTimeout(() => piggy.kill(), 1000);
	});
	game.add(piggy);
}
makePiggy();

await game.start(loader);
dialpad.style.display = 'flex';
