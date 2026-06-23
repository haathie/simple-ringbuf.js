import assert from "assert";
import type { TypedArray } from "../types";

export class SeededPRNG {
	#next: () => number;

	constructor(seed = 11) {
		this.#next = () => {
			let t = (seed += 0x6d2b79f5);
			t = Math.imul(t ^ (t >>> 15), t | 1);
			t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}

	randomInt(max: number): number {
		return Math.floor(this.#next() * (max + 1));
	}
}

export class SequenceGenerator {
	#index = 0;

	fill(array: TypedArray, length = array.length, offset = 0): void {
		for (let i = offset; i < offset + length; i++) {
			array[i] = this.#index++;
		}
	}
}

export class SequenceVerifier {
	#index = 0;

	check(array: TypedArray, length = array.length, offset = 0): void {
		for (let i = offset; i < offset + length; i++) {
			assert.equal(
				array[i],
				this.#index++,
				`unexpected sequence value at index ${i}`,
			);
		}
	}
}
