import type { TypedArray, TypedArrayConstructor } from "./types.ts";

type RingBufferOpts = {
	type: TypedArrayConstructor;
	buffer: ArrayBuffer;
};

/**
 * The base RingBuffer class
 *
 * A single-threaded typed-array ring buffer.
 */
export class RingBuffer {
	/** Allocate the ArrayBuffer for a RingBuffer, based on the type and
	 * capacity required
	 * @param capacity The number of elements the ring buffer will be
	 * able to hold.
	 * @param type A typed array constructor, the type that this ring
	 * buffer will hold.
	 * @return An ArrayBuffer of the right size.
	 */
	static getStorageForCapacity(
		capacity: number,
		type: TypedArrayConstructor,
	): ArrayBuffer {
		if (!type.BYTES_PER_ELEMENT) {
			throw TypeError("Pass in an ArrayBuffer subclass");
		}

		// need capacity + 1 element slots to distinguish between full and empty
		const bytes = (capacity + 1) * type.BYTES_PER_ELEMENT;
		return new ArrayBuffer(bytes);
	}

	#type: TypedArrayConstructor;
	#capacity: number;
	#buf: ArrayBuffer;
	#writePtr = 0;
	#readPtr = 0;
	#storage: TypedArray;

	constructor({ type, buffer }: RingBufferOpts) {
		if (type.BYTES_PER_ELEMENT === undefined) {
			throw TypeError(
				"Pass a concrete typed array class as second argument",
			);
		}

		this.#type = type;

		// Maximum usable size is 1<<32 - type.BYTES_PER_ELEMENT bytes in the ring
		// buffer for this version, easily changeable.
		// capacity counts the empty slot to distinguish between full and empty.
		this.#capacity = buffer.byteLength / type.BYTES_PER_ELEMENT;
		this.#buf = buffer;
		this.#storage = new type(this.#buf, 0, this.#capacity);
	}

	get type() {
		return this.#type.name;
	}

	/**
	 * Push elements to the ring buffer.
	 * @param elements A typed array of the same type as passed in the ctor, to be written to the queue.
	 * @param length If passed, the maximum number of elements to push.
	 * If not passed, all elements in the input array are pushed.
	 * @param offset If passed, a starting index in elements from which
	 * the elements are read. If not passed, elements are read from index 0.
	 * @return the number of elements written to the queue.
	 */
	push(elements: TypedArray, length?: number, offset = 0): number {
		const rd = this.#readPtr;
		const wr = this.#writePtr;

		if ((wr + 1) % this.#storageCapacity() === rd) {
			// full
			return 0;
		}

		const len = length !== undefined ? length : elements.length;

		const toWrite = Math.min(this.#availableWrite(rd, wr), len);
		const firstPart = Math.min(this.#storageCapacity() - wr, toWrite);
		const secondPart = toWrite - firstPart;

		this.#copy(elements, offset, this.#storage, wr, firstPart);
		this.#copy(elements, offset + firstPart, this.#storage, 0, secondPart);

		this.#writePtr = (wr + toWrite) % this.#storageCapacity();

		return toWrite;
	}

	/**
	 * Read up to `elements.length` elements from the ring buffer. `elements` is a typed
	 * array of the same type as passed in the ctor.
	 * Returns the number of elements read from the queue, they are placed at the
	 * beginning of the array passed as parameter.
	 * @param elements An array in which the elements read from the
	 * queue will be written, starting at the beginning of the array.
	 * @param length If passed, the maximum number of elements to pop. If
	 * not passed, up to elements.length are popped.
	 * @param offset If passed, an index in elements in which the data is
	 * written to. `elements.length - offset` must be greater or equal to
	 * `length`.
	 * @return The number of elements read from the queue.
	 */
	pop(elements: TypedArray, length?: number, offset = 0): number {
		const rd = this.#readPtr;
		const wr = this.#writePtr;

		if (wr === rd) {
			return 0;
		}

		const len = length !== undefined ? length : elements.length;
		const toRead = Math.min(this.#availableRead(rd, wr), len);

		const firstPart = Math.min(this.#storageCapacity() - rd, toRead);
		const secondPart = toRead - firstPart;

		this.#copy(this.#storage, rd, elements, offset, firstPart);
		this.#copy(this.#storage, 0, elements, offset + firstPart, secondPart);

		this.#readPtr = (rd + toRead) % this.#storageCapacity();

		return toRead;
	}

	/**
	 * @return True if the ring buffer is empty, false otherwise.
	 */
	get isEmpty() {
		return this.#writePtr === this.#readPtr;
	}

	/**
	 * @return True if the ring buffer is full, false otherwise.
	 */
	get isFull() {
		return (this.#writePtr + 1) % this.#storageCapacity() === this.#readPtr;
	}

	/**
	 * Make the ring buffer logically empty without clearing storage.
	 */
	clear(): void {
		this.#readPtr = this.#writePtr;
	}

	/**
	 * @return The usable capacity for the ring buffer: the number of elements
	 * that can be stored.
	 */
	capacity(): number {
		return this.#capacity - 1;
	}

	/**
	 * @return The number of elements available for reading.
	 */
	get availableRead() {
		return this.#availableRead(this.#readPtr, this.#writePtr);
	}

	/**
	 * @return The number of elements available for writing.
	 */
	get availableWrite() {
		return this.#availableWrite(this.#readPtr, this.#writePtr);
	}

	// private methods //

	/**
	 * @return Number of elements available for reading, given a read and write
	 * pointer.
	 * @private
	 */
	#availableRead(rd: number, wr: number): number {
		return (wr + this.#storageCapacity() - rd) % this.#storageCapacity();
	}

	/**
	 * @return Number of elements available from writing, given a read and write
	 * pointer.
	 * @private
	 */
	#availableWrite(rd: number, wr: number): number {
		return this.capacity() - this.#availableRead(rd, wr);
	}

	/**
	 * @return The size of the storage for elements not accounting the space for
	 * the index, counting the empty slot.
	 * @private
	 */
	#storageCapacity(): number {
		return this.#capacity;
	}

	/**
	 * Copy `size` elements from `input`, starting at offset `offsetInput`, to
	 * `output`, starting at offset `offsetOutput`.
	 * @param input The array to copy from
	 * @param offsetInput The index at which to start the copy
	 * @param output The array to copy to
	 * @param offsetOutput The index at which to start copying the elements to
	 * @param size The number of elements to copy
	 * @private
	 */
	#copy(
		input: TypedArray,
		offsetInput: number,
		output: TypedArray,
		offsetOutput: number,
		size: number,
	): void {
		if (!size) {
			return;
		}
		// Fast-path: use `set(...)` if possible: copying all the input linearly to the output.
		if (
			offsetInput === 0 &&
			offsetOutput + input.length <= this.#storageCapacity() &&
			input.length === size
		) {
			output.set(input, offsetOutput);
			return;
		}

		// Slow path: copy element by element, but at least JIT-optimized.

		/* Original algorithm (unoptimized):

      for (let i = 0; i < size; i++) {
        output[offsetOutput + i] = input[offsetInput + i];
      }

      Optimized algorithm (unrolled loop, factor 16):
    */

		let i = 0;
		const unrollFactor = 16;

		// unroll the loop for better performance; best unroll factor in 2025 for this is 16
		// across all engines: https://github.com/padenot/ringbuf.js/issues/22#issuecomment-2590990421
		for (; i <= size - unrollFactor; i += unrollFactor) {
			output[offsetOutput + i] = input[offsetInput + i];
			output[offsetOutput + i + 1] = input[offsetInput + i + 1];
			output[offsetOutput + i + 2] = input[offsetInput + i + 2];
			output[offsetOutput + i + 3] = input[offsetInput + i + 3];
			output[offsetOutput + i + 4] = input[offsetInput + i + 4];
			output[offsetOutput + i + 5] = input[offsetInput + i + 5];
			output[offsetOutput + i + 6] = input[offsetInput + i + 6];
			output[offsetOutput + i + 7] = input[offsetInput + i + 7];
			output[offsetOutput + i + 8] = input[offsetInput + i + 8];
			output[offsetOutput + i + 9] = input[offsetInput + i + 9];
			output[offsetOutput + i + 10] = input[offsetInput + i + 10];
			output[offsetOutput + i + 11] = input[offsetInput + i + 11];
			output[offsetOutput + i + 12] = input[offsetInput + i + 12];
			output[offsetOutput + i + 13] = input[offsetInput + i + 13];
			output[offsetOutput + i + 14] = input[offsetInput + i + 14];
			output[offsetOutput + i + 15] = input[offsetInput + i + 15];
		}

		// remaining elements for when the size is not a multiple of unrollFactor
		for (; i < size; i++) {
			output[offsetOutput + i] = input[offsetInput + i];
		}
	}
}
