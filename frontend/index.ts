import {DisplayMode, Engine, Random, TileMap, vec} from 'excalibur';

import {loader} from './loader';
import {sndPlugin} from './sounds';
import {spellSlots} from './spells';
import {enemyAnims, redWitchAnims, terrainGrass} from './sprites';
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
	pos: vec(100, 200),
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
	button.addEventListener('mousedown', () => redWitch.motion.vel = vel);
}
window.addEventListener('mouseup', () => redWitch.motion.vel = vec(0, 0));

const ENEMY_START = vec(500, 200);
const enemy = new Unit({
	pos: ENEMY_START,
	offset: vec(-4, -3),
	scale: vec(2, 2),
	width: 22,
	height: 36,
}, {
	maxHP: null,
	animations: {...enemyAnims, charge: enemyAnims.idle, takeDamage: enemyAnims.idle},
	spellSlots: [],
});
enemy.graphics.flipHorizontal = true;
game.add(enemy);
function enemyAttack(target: Unit): Promise<void> {
	enemyAnims.attack.reset();
	enemy.graphics.use(enemyAnims.attack);
	const {promise, resolve} = Promise.withResolvers<void>();
	enemy.actions
		.moveTo(vec(target.pos.x + 60, target.pos.y), 1000)
		.delay(200)
		.callMethod(() => {
			sndPlugin.playSound('kinetic');
			target.animations.takeDamage.reset();
			target.graphics.use(target.animations.takeDamage);
		})
		.delay(500)
		.moveTo(ENEMY_START, 2000)
		.callMethod(() => {
			enemy.graphics.use(enemyAnims.idle);
			target.takeDamage(10);
			if (target.isDead())
				void target.die().then(resolve);
			else
				resolve();
		});
	return promise;
}

await game.start(loader);
dialpad.style.display = 'flex';
