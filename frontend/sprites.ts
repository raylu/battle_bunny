import {Animation, AnimationStrategy, ImageSource, type Loadable, SpriteSheet, range} from 'excalibur';

import {loader} from './loader';

export interface UnitAnimations {
	readonly idle: Animation,
	readonly charge: Animation,
	readonly takeDamage: Animation,
	readonly death: Animation,
}

const resources: Loadable<any>[] = [];

function witchAnimation(name: string, rows: number, width: number, height: number, start = 0, strategy?: AnimationStrategy) {
	const image = new ImageSource(`static/sprites/${name}.png`);
	resources.push(image);
	return Animation.fromSpriteSheet(SpriteSheet.fromImageSource({
		image,
		grid: {
			rows,
			columns: 1,
			spriteHeight: height,
			spriteWidth: width,
		},
	}), range(start, rows - 1), 100, strategy);
}
export const redWitchAnims: UnitAnimations = {
	idle: witchAnimation('red_witch/idle', 6, 32, 64),
	charge: witchAnimation('red_witch/charge', 10, 40, 65, 2),
	takeDamage: witchAnimation('red_witch/take_damage', 3, 32, 64, 0, AnimationStrategy.Freeze),
	death: witchAnimation('red_witch/death', 14, 56, 64, 0, AnimationStrategy.Freeze),
} as const;
export const redWitchIconImg = new ImageSource('static/sprites/red_witch/icon.gif');

const piggyImg = new ImageSource('static/sprites/piggy.png');
const piggySprites = SpriteSheet.fromImageSource({
	image: piggyImg,
	grid: {
		rows: 2,
		columns: 5,
		spriteHeight: 18,
		spriteWidth: 19,
	},
});
export const piggyAnims = {
	idle: Animation.fromSpriteSheet(piggySprites, range(5, 8), 100),
	death: Animation.fromSpriteSheet(piggySprites, range(0, 3), 100, AnimationStrategy.Freeze),
} as const;

const terrainGrassImg = new ImageSource('static/sprites/terrain/tileset_grass.png');
export const terrainGrass = SpriteSheet.fromImageSource({
	image: terrainGrassImg,
	grid: {
		rows: 4,
		columns: 4,
		spriteHeight: 64,
		spriteWidth: 64,
	},
});

loader.addResources([...resources, redWitchIconImg, piggyImg, terrainGrassImg]);
