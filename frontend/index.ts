import {Color, DisplayMode, Engine, Random, TileMap, vec} from 'excalibur';

import {loader} from './loader';
import {sndPlugin} from './sounds';
import {spellSlots} from './spells';
import {enemyAnims, redWitchAnims, terrainGrass} from './sprites';
import {Unit} from './unit';

const game = new Engine({
	canvasElement: document.querySelector('canvas#game') as HTMLCanvasElement,
	width: 512, // must be a multiple of referenceGrassSprite.width (64)
	height: 640,
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
const up = document.querySelector('.dialpad .up') as HTMLElement;
up.addEventListener('mousedown', () => redWitch.motion.vel.y = -100);
up.addEventListener('mouseup', () => redWitch.motion.vel.y = 0);
const down = document.querySelector('.dialpad .down') as HTMLElement;
down.addEventListener('mousedown', () => redWitch.motion.vel.y = 100);
down.addEventListener('mouseup', () => redWitch.motion.vel.y = 0);
const left = document.querySelector('.dialpad .left') as HTMLElement;
left.addEventListener('mousedown', () => redWitch.motion.vel.x = -100);
left.addEventListener('mouseup', () => redWitch.motion.vel.x = 0);
const right = document.querySelector('.dialpad .right') as HTMLElement;
right.addEventListener('mousedown', () => redWitch.motion.vel.x = 100);
right.addEventListener('mouseup', () => redWitch.motion.vel.x = 0);

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

void game.start(loader);
