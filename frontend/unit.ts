import {Actor, type ActorArgs, CollisionType, Color, Debug, Engine, type ExcaliburGraphicsContext, type Rectangle,
	Vector, vec} from 'excalibur';
import type {UnitAnimations} from './sprites';

interface UnitConfig {
	maxHP: number | null;
	animations: UnitAnimations,
}

export class Unit extends Actor {
	readonly health: null | {
		readonly maxHP: number;
		readonly bar: Actor;
		readonly barMaxWidth: number;
	};
	damageTaken: number;
	animations: UnitAnimations;

	constructor(config: ActorArgs & {width: number, height: number}, unitConfig: UnitConfig) {
		super(config);

		if (unitConfig.maxHP === null)
			this.health = null;
		else {
			const barMaxWidth = unitConfig.maxHP * 0.8;
			this.health = {
				maxHP: unitConfig.maxHP,
				barMaxWidth,
				bar: new Actor({
					width: barMaxWidth,
					height: 5,
					color: Color.Chartreuse,
					pos: vec(-barMaxWidth / 2 + 1, -config.height / 2 - 6),
					anchor: vec(0, 1),
					collisionType: CollisionType.PreventCollision,
				}),
			};
			this.health.bar.graphics.onPostDraw = (gfx: ExcaliburGraphicsContext) => {
				gfx.drawRectangle(vec(0, -6), barMaxWidth, 7, Color.Transparent, Color.fromRGB(100, 200, 100), 1);
			};
			this.addChild(this.health.bar);
		}
		this.damageTaken = 0;

		this.animations = unitConfig.animations;
		this.graphics.use(unitConfig.animations.idle);
	}

	onPostUpdate(engine: Engine<any>, delta: number): void {
		Debug.drawLine(
			this.pos,
			this.pos.add(Vector.Down.scale(75)), {
			color: Color.Red,
		});
		Debug.drawPoint(this.pos, {
			size: 4,
			color: Color.Violet,
		});
		Debug.drawCircle(this.pos, 75, {
			color: Color.Transparent,
			strokeColor: Color.Black,
			width: 1,
		});
		Debug.drawBounds(this.collider.bounds, {color: Color.Yellow});
	}

	takeDamage(damage: number) {
		this.damageTaken += damage;
		if (this.health !== null) {
			const hp = Math.max(this.health.maxHP - this.damageTaken, 0);
			(this.health.bar.graphics.current as Rectangle).width = hp / this.health.maxHP * this.health.barMaxWidth;
		}
	}

	isDead() {
		return this.health !== null && this.damageTaken >= this.health.maxHP;
	}

	reset() {
		this.damageTaken = 0;
		this.takeDamage(0);
		this.graphics.use(this.animations.idle);
	}

	die(): Promise<void> {
		this.animations.death.reset();
		this.graphics.use(this.animations.death);
		const {promise, resolve} = Promise.withResolvers<void>();
		this.animations.death.events.once('end', () => {
			resolve();
		});
		return promise;
	}
}
