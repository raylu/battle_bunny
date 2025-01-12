import {Actor, BaseAlign, Color, type Engine, Font, type Graphic, Label, type PointerEvent, ScreenElement, TextAlign,
	type Vector, range, vec} from 'excalibur';

import {fireExplosion, fireHold, fireSound, iceSound, sndPlugin} from './sounds';
import {armageddonAnims, fireballAnims, iceBlastAnims, iceNovaAnims, redWitchIconImg, spellIcons} from './sprites';
import type {Unit} from './unit';

interface SpellOpts {
	name: string;
	baseCooldown: number | null;
	stats: Partial<SpellStats>;
	icon: {x: number; y: number};
	castFn: CastFn;
}
interface SpellStats {
	damage: number;
	damageAll: number;
	targetFrozenDamageMultiplier: number;
	freeze: number;
}
type CastFn = (game: Engine, caster: Unit, target: Unit) => Promise<void>;

export interface SpellSlot {
	readonly slot: ScreenElement;
	spell: Spell | null;
}

const tooltip = document.querySelector<HTMLElement>('tooltip')!;
const cooldownFont = new Font({
	size: 16,
	color: Color.White,
	shadow: {
		offset: vec(1, 1),
		color: Color.Black,
	},
	textAlign: TextAlign.Center,
	baseAlign: BaseAlign.Middle,
});

class Spell {
	name: string;
	icon: ScreenElement;
	iconPos: Vector;
	spellSlot: SpellSlot | null = null;
	stats: SpellStats;
	cooldown: null | {
		base: number;
		remaining: number;
	} = null;
	tooltipHTML: string;
	private castFn: CastFn;

	constructor(opts: SpellOpts) {
		this.name = opts.name;
		if (opts.baseCooldown !== null)
			this.cooldown = {base: opts.baseCooldown, remaining: 0};
		this.stats = {
			damage: opts.stats.damage ?? 0,
			damageAll: opts.stats.damageAll ?? 0,
			targetFrozenDamageMultiplier: opts.stats.targetFrozenDamageMultiplier ?? 1,
			freeze: opts.stats.freeze ?? 0,
		};
		this.tooltipHTML = `<b>${opts.name}</b>`;
		if (this.cooldown !== null)
			this.tooltipHTML += `<br>cooldown: ${this.cooldown.base}`;
		if (this.stats.damage > 0)
			this.tooltipHTML += `<br>damage: ${this.stats.damage}`;
		if (this.stats.damageAll > 0)
			this.tooltipHTML += `<br>deals ${this.stats.damageAll} damage to <strong>all</strong> units`;
		if (this.stats.targetFrozenDamageMultiplier !== 1)
			this.tooltipHTML += `<br>${this.stats.targetFrozenDamageMultiplier}× damage multiplier to frozen targets`;
		if (this.stats.freeze > 0)
			this.tooltipHTML += `<br>target gains +${this.stats.freeze}% freeze`;

		const iconSprite = spellIcons.getSprite(opts.icon.x, opts.icon.y);
		this.icon = new ScreenElement({
			width: iconSprite.width / 2,
			height: iconSprite.height / 2,
			scale: vec(2, 2),
			anchor: vec(0.5, 0.5),
			z: 1,
		});
		this.icon.graphics.use(iconSprite);
		this.icon.on('pointerenter', () => {
			tooltip.innerHTML = this.tooltipHTML;
			tooltip.style.opacity = '0.9';
		});
		this.icon.on('pointerleave', () => {
			tooltip.style.opacity = '0';
		});
		this.icon.on('pointermove', (event: PointerEvent) => {
			const height = tooltip.getBoundingClientRect().height;
			tooltip.style.top = (event.screenPos.y - height - 4) + 'px';
			if (this.icon.pos.x < 320) {
				tooltip.style.left = event.screenPos.x + 'px';
				tooltip.style.right = '';
			} else {
				tooltip.style.right = (640 - event.screenPos.x) + 'px';
				tooltip.style.left = '';
			}
		});
		this.iconPos = vec(0, 0);

		this.castFn = opts.castFn;
	}

	placeIcon(spellSlot: SpellSlot) {
		spellSlot.spell = this;
		if (this.spellSlot !== null)
			this.spellSlot.spell = null;
		this.spellSlot = spellSlot;
		this.iconPos = spellSlot.slot.pos.clone();
		this.icon.pos = spellSlot.slot.pos.clone();
	}

	async cast(game: Engine, caster: Unit, target: Unit, allUnits: Unit[]): Promise<number> {
		this.startCooldown();
		await this.castFn(game, caster, target);

		target.freeze += this.stats.freeze;

		const deaths = [];
		let targetDamage = this.stats.damage + this.stats.damageAll;
		if (target.freeze > 100)
			targetDamage *= this.stats.targetFrozenDamageMultiplier;
		target.takeDamage(targetDamage);
		if (target.isDead())
			deaths.push(target.die());

		for (const unit of allUnits) {
			if (unit.isDead())
				continue;
			if (!Object.is(unit, target))
				unit.takeDamage(this.stats.damageAll);
			if (unit.isDead())
				deaths.push(unit.die());
		}
		await Promise.all(deaths);

		return targetDamage;
	}

	startCooldown() {
		if (this.cooldown !== null) {
			this.cooldown.remaining = this.cooldown.base;
			const cdLabel = new Label({
				text: String(this.cooldown.base),
				font: cooldownFont,
				pos: vec(-1, 0),
				z: 1,
			});
			this.icon.addChild(cdLabel);
		}
	}

	decrementCooldown() {
		if (this.cooldown !== null && this.cooldown.remaining > 0) {
			this.cooldown.remaining--;
			if (this.cooldown.remaining === 0)
				this.clearCooldown();
			else {
				const cdLabel = this.icon.children[0] as Label;
				cdLabel.text = String(this.cooldown.remaining);
			}
		}
	}

	clearCooldown() {
		if (this.cooldown !== null) {
			this.icon.removeAllChildren();
		}
	}
}

function iceBlast(game: Engine, caster: Unit, target: Unit): Promise<void> {
	caster.graphics.use(caster.animations.charge);
	const iceBlastProj = new Actor({
		pos: caster.pos,
		width: iceBlastAnims.projectile.width,
		height: iceBlastAnims.projectile.height,
	});
	iceBlastAnims.startup.reset();
	iceBlastProj.graphics.use(iceBlastAnims.startup);
	iceBlastAnims.startup.events.once('end', () => {
		iceBlastProj.graphics.use(iceBlastAnims.projectile);
		caster.graphics.use(caster.animations.idle);
		iceBlastProj.actions.moveTo(target.pos.add(vec(-20, 0)), 800);
	});
	game.add(iceBlastProj);
	const {promise, resolve} = Promise.withResolvers<void>();
	iceBlastProj.events.on('actioncomplete', () => {
		iceBlastAnims.impact.reset();
		iceBlastProj.graphics.use(iceBlastAnims.impact);
		sndPlugin.playSound('spell');
		iceSound.volume = 0.1;
	});
	iceBlastAnims.impact.events.once('end', () => {
		iceBlastProj.kill();
		resolve();
	});
	void iceSound.play(0.5);
	return promise;
}

function iceNova(game: Engine, caster: Unit, target: Unit): Promise<void> {
	caster.graphics.use(caster.animations.charge);
	const iceNovaVortex = new Actor({
		pos: target.pos,
	});
	iceNovaAnims.startup.reset();
	iceNovaVortex.graphics.use(iceNovaAnims.startup);
	iceNovaAnims.startup.events.once('end', () => {
		iceNovaAnims.nova.reset();
		iceNovaVortex.graphics.use(iceNovaAnims.nova);
		caster.graphics.use(caster.animations.idle);
	});
	iceNovaAnims.nova.events.once('end', () => {
		iceNovaAnims.end.reset();
		iceNovaVortex.graphics.use(iceNovaAnims.end);
		sndPlugin.playSound('spellBig');
		iceSound.volume = 0.1;
	});
	const {promise, resolve} = Promise.withResolvers<void>();
	iceNovaAnims.end.events.once('end', () => {
		iceNovaVortex.kill();
		resolve();
	});
	game.add(iceNovaVortex);
	void iceSound.play(0.5);
	return promise;
}

function fireball(game: Engine, caster: Unit, target: Unit): Promise<void> {
	caster.graphics.use(caster.animations.charge);
	const fireballProj = new Actor({
		pos: caster.pos,
		width: fireballAnims.projectile.width,
		height: fireballAnims.projectile.height,
	});
	fireballProj.graphics.use(fireballAnims.projectile);
	game.add(fireballProj);
	fireballProj.actions.moveTo(target.pos.add(vec(-20, 0)), 600);
	void fireSound.play(0.5);
	const {promise, resolve} = Promise.withResolvers<void>();
	fireballProj.events.on('actioncomplete', () => {
		caster.graphics.use(caster.animations.idle);
		fireballAnims.impact.reset();
		fireballProj.graphics.use(fireballAnims.impact);
		sndPlugin.playSound('spell');
	});
	fireballAnims.impact.events.once('end', () => {
		fireballProj.kill();
		resolve();
	});
	return promise;
}

function armageddon(game: Engine, caster: Unit, target: Unit): Promise<void> {
	caster.graphics.use(caster.animations.charge);
	const explosion = new Actor({
		pos: vec(game.drawWidth / 2, 220),
		anchor: vec(0.5, 0.5),
		scale: vec(9, 9),
	});
	armageddonAnims.beam.reset();
	explosion.graphics.use(armageddonAnims.beam);
	game.add(explosion);
	void fireHold.play();
	const {promise, resolve} = Promise.withResolvers<void>();
	armageddonAnims.beam.events.once('end', () => {
		caster.graphics.use(caster.animations.idle);
		fireHold.stop();
		armageddonAnims.explosion.reset();
		explosion.graphics.use(armageddonAnims.explosion);
		void fireExplosion.play();
	});
	armageddonAnims.explosion.events.once('end', () => {
		explosion.kill();
		resolve();
	});
	return promise;
}

export const spells = [
	new Spell({name: 'ice blast',
		baseCooldown: null,
		stats: {damage: 20, freeze: 25},
		icon: {x: 3, y: 2},
		castFn: iceBlast,
	}),
	new Spell({
		name: 'ice nova',
		baseCooldown: 4,
		stats: {damage: 10, targetFrozenDamageMultiplier: 5},
		icon: {x: 4, y: 1},
		castFn: iceNova,
	}),
	new Spell({
		name: 'fireball',
		baseCooldown: null,
		stats: {damage: 20},
		icon: {x: 2, y: 0},
		castFn: fireball,
	}),
	new Spell({
		name: 'armageddon',
		baseCooldown: 4,
		stats: {damageAll: 30},
		icon: {x: 8, y: 1},
		castFn: armageddon,
	}),
];

export const spellSlots = {
	bar: [] as SpellSlot[],
	blueWitch: [] as SpellSlot[],
	redWitch: [] as SpellSlot[],
	whiteWitch: [] as SpellSlot[],
} as const;

export const SLOT_DEFAULT_COLOR = Color.fromRGB(92, 97, 128);
