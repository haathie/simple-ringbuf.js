import assert from "node:assert/strict";
import test from "node:test";

import type { TypedArray, TypedArrayConstructor } from "../types";
import { SequenceGenerator, SequenceVerifier, SeededPRNG } from "./utils.ts";
import { RingBuffer } from "../ringbuf.ts";

type RingBufferInstance = InstanceType<typeof RingBuffer>;

function createRingBuffer(
	capacity: number,
	type: TypedArrayConstructor = Uint32Array,
): RingBufferInstance {
	return new RingBuffer({
		type,
		buffer: RingBuffer.getStorageForCapacity(capacity, type),
	});
}

function assertAccounting(
	rb: RingBufferInstance,
	expectedLength: number,
): void {
	assert.equal(rb.availableRead, expectedLength);
	assert.equal(rb.availableWrite, rb.capacity() - expectedLength);
	assert.equal(rb.isEmpty, expectedLength === 0);
	assert.equal(rb.isFull, expectedLength === rb.capacity());
}

function assertTypedArrayContents(
	actual: TypedArray,
	expected: number[],
): void {
	assert.deepEqual(Array.from(actual), expected);
}

test("allocates storage for requested usable capacity", () => {
	assert.equal(
		RingBuffer.getStorageForCapacity(4, Uint32Array).byteLength,
		5 * Uint32Array.BYTES_PER_ELEMENT,
	);
	assert.equal(
		RingBuffer.getStorageForCapacity(8, Float32Array).byteLength,
		9 * Float32Array.BYTES_PER_ELEMENT,
	);
	assert.equal(
		RingBuffer.getStorageForCapacity(3, Float64Array).byteLength,
		4 * Float64Array.BYTES_PER_ELEMENT,
	);
	assert.throws(
		() =>
			RingBuffer.getStorageForCapacity(
				4,
				Array as unknown as TypedArrayConstructor,
			),
		TypeError,
	);
});

test("reports initial state", () => {
	const rb = createRingBuffer(4, Uint32Array);

	assert.equal(rb.type, "Uint32Array");
	assert.equal(rb.capacity(), 4);
	assertAccounting(rb, 0);
});

test("pushes and pops in FIFO order", () => {
	const rb = createRingBuffer(4, Uint32Array);

	assert.equal(rb.push(new Uint32Array([1, 2, 3])), 3);
	assertAccounting(rb, 3);

	const output = new Uint32Array(3);
	assert.equal(rb.pop(output), 3);
	assertTypedArrayContents(output, [1, 2, 3]);
	assertAccounting(rb, 0);
});

test("fills to usable capacity", () => {
	const rb = createRingBuffer(4, Uint8Array);

	assert.equal(rb.push(new Uint8Array([1, 2, 3, 4])), 4);
	assertAccounting(rb, 4);
});

test("push returns partial count when full", () => {
	const rb = createRingBuffer(3, Uint32Array);

	assert.equal(rb.push(new Uint32Array([1, 2, 3, 4, 5])), 3);
	assertAccounting(rb, 3);

	const output = new Uint32Array(3);
	assert.equal(rb.pop(output), 3);
	assertTypedArrayContents(output, [1, 2, 3]);
	assertAccounting(rb, 0);
});

test("pop returns partial count when underfilled", () => {
	const rb = createRingBuffer(5, Uint32Array);
	const output = new Uint32Array(5);

	assert.equal(rb.pop(output), 0);
	assert.equal(rb.push(new Uint32Array([10, 20])), 2);
	assert.equal(rb.pop(output), 2);
	assertTypedArrayContents(output, [10, 20, 0, 0, 0]);
	assertAccounting(rb, 0);
});

test("zero-length push and pop are no-ops", () => {
	const rb = createRingBuffer(3, Uint32Array);

	assert.equal(rb.push(new Uint32Array([1, 2]), 0), 0);
	assertAccounting(rb, 0);

	assert.equal(rb.push(new Uint32Array([1, 2])), 2);
	assert.equal(rb.pop(new Uint32Array(2), 0), 0);
	assertAccounting(rb, 2);
});

test("wraps around while preserving FIFO order", () => {
	const rb = createRingBuffer(5, Uint32Array);
	const first = new Uint32Array(3);
	const all = new Uint32Array(5);

	assert.equal(rb.push(new Uint32Array([1, 2, 3, 4])), 4);
	assert.equal(rb.pop(first), 3);
	assertTypedArrayContents(first, [1, 2, 3]);
	assertAccounting(rb, 1);

	assert.equal(rb.push(new Uint32Array([5, 6, 7, 8])), 4);
	assertAccounting(rb, 5);
	assert.equal(rb.pop(all), 5);
	assertTypedArrayContents(all, [4, 5, 6, 7, 8]);
	assertAccounting(rb, 0);
});

test("repeated symmetrical push/pop preserves sequence", () => {
	for (const capacity of [1, 2, 3, 16, 1024]) {
		for (const chunkSize of [1, capacity]) {
			const rb = createRingBuffer(capacity, Uint32Array);
			const generator = new SequenceGenerator();
			const verifier = new SequenceVerifier();
			const input = new Uint32Array(chunkSize);
			const output = new Uint32Array(chunkSize);

			for (let i = 0; i < 100; i++) {
				generator.fill(input);
				assert.equal(rb.push(input), chunkSize);
				assertAccounting(rb, chunkSize);
				assert.equal(rb.pop(output), chunkSize);
				verifier.check(output);
				assertAccounting(rb, 0);
			}
		}
	}
});

test("repeated asymmetrical push/pop preserves sequence", () => {
	for (const { capacity, pushSize, popSize } of [
		{ capacity: 17, pushSize: 5, popSize: 3 },
		{ capacity: 32, pushSize: 7, popSize: 11 },
		{ capacity: 1024, pushSize: 64, popSize: 13 },
	]) {
		const rb = createRingBuffer(capacity, Uint32Array);
		const generator = new SequenceGenerator();
		const verifier = new SequenceVerifier();
		const input = new Uint32Array(pushSize);
		const output = new Uint32Array(popSize);
		let expectedLength = 0;

		for (let i = 0; i < 500; i++) {
			const toWrite = Math.min(rb.availableWrite, input.length);
			generator.fill(input, toWrite);
			const written = rb.push(input, toWrite);
			assert.equal(written, toWrite);
			expectedLength += written;
			assertAccounting(rb, expectedLength);

			const read = rb.pop(output);
			verifier.check(output, read);
			expectedLength -= read;
			assertAccounting(rb, expectedLength);
		}
	}
});

test("randomized push/pop preserves sequence and accounting", () => {
	const rb = createRingBuffer(128, Uint32Array);
	const rng = new SeededPRNG(13);
	const generator = new SequenceGenerator();
	const verifier = new SequenceVerifier();
	const input = new Uint32Array(32);
	const output = new Uint32Array(32);
	let expectedLength = 0;

	for (let i = 0; i < 1000; i++) {
		const toWrite = rng.randomInt(
			Math.min(input.length, rb.availableWrite),
		);
		generator.fill(input, toWrite);
		const written = rb.push(input, toWrite);
		assert.equal(written, toWrite);
		expectedLength += written;
		assertAccounting(rb, expectedLength);

		const toRead = rng.randomInt(output.length);
		const read = rb.pop(output, toRead);
		assert.equal(read, Math.min(toRead, expectedLength));
		verifier.check(output, read);
		expectedLength -= read;
		assertAccounting(rb, expectedLength);
	}
});

test("push reads from source offset only", () => {
	const rb = createRingBuffer(3, Float32Array);
	const input = new Float32Array([
		Infinity,
		Infinity,
		1,
		2,
		3,
		Infinity,
		Infinity,
	]);
	const output = new Float32Array(3);

	assert.equal(rb.push(input, 3, 2), 3);
	assert.equal(rb.pop(output), 3);
	assertTypedArrayContents(output, [1, 2, 3]);
});

test("pop writes to destination offset only", () => {
	const rb = createRingBuffer(3, Float32Array);
	const output = new Float32Array([NaN, NaN, 0, 0, 0, NaN, NaN]);

	assert.equal(rb.push(new Float32Array([1, 2, 3])), 3);
	assert.equal(rb.pop(output, 3, 2), 3);
	assert.ok(Number.isNaN(output[0]));
	assert.ok(Number.isNaN(output[1]));
	assert.equal(output[2], 1);
	assert.equal(output[3], 2);
	assert.equal(output[4], 3);
	assert.ok(Number.isNaN(output[5]));
	assert.ok(Number.isNaN(output[6]));
});

test("offset push/pop works across wraparound", () => {
	const rb = createRingBuffer(5, Uint32Array);
	const discarded = new Uint32Array(3);
	const input = new Uint32Array([99, 99, 5, 6, 7, 8, 99, 99]);
	const output = new Uint32Array([99, 99, 0, 0, 0, 0, 0, 99, 99]);

	assert.equal(rb.push(new Uint32Array([1, 2, 3, 4])), 4);
	assert.equal(rb.pop(discarded), 3);
	assert.equal(rb.push(input, 4, 2), 4);
	assert.equal(rb.pop(output, 5, 2), 5);
	assertTypedArrayContents(output, [99, 99, 4, 5, 6, 7, 8, 99, 99]);
});

test("clear empties buffer and preserves reusability", () => {
	const rb = createRingBuffer(3, Uint32Array);
	const output = new Uint32Array(3);

	assert.equal(rb.push(new Uint32Array([1, 2, 3])), 3);
	rb.clear();
	assertAccounting(rb, 0);
	assert.equal(rb.pop(output), 0);

	assert.equal(rb.push(new Uint32Array([4, 5])), 2);
	assert.equal(rb.pop(output, 2), 2);
	assertTypedArrayContents(output, [4, 5, 0]);
	assertAccounting(rb, 0);
});

test("supports typed array variants", () => {
	const types: TypedArrayConstructor[] = [
		Int8Array,
		Uint8Array,
		Uint8ClampedArray,
		Int16Array,
		Uint16Array,
		Int32Array,
		Uint32Array,
		Float32Array,
		Float64Array,
	];

	for (const type of types) {
		const rb = createRingBuffer(3, type);
		const input = new type([1, 2, 3]);
		const output = new type(3);

		assert.equal(rb.type, type.name);
		assert.equal(rb.push(input), 3);
		assert.equal(rb.pop(output), 3);
		assertTypedArrayContents(output, [1, 2, 3]);
		assertAccounting(rb, 0);
	}
});
