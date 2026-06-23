# `simple-ringbuf.js`

A small, single-threaded typed-array ring buffer for JavaScript.

This project is a simplified fork of [`ringbuf.js`](https://github.com/padenot/ringbuf.js) by Paul Adenot. The original project provides a wait-free, thread-safe `SharedArrayBuffer` ring buffer and related Web Audio utilities. This fork intentionally removes that scope.

`simple-ringbuf.js` is **not thread-safe**. It uses `ArrayBuffer`, not `SharedArrayBuffer`, and is intended for single-threaded FIFO buffering.

## Install

```sh
npm install simple-ringbuf.js
```

## Usage

```js
import { RingBuffer } from "simple-ringbuf.js";

const ringBuffer = new RingBuffer({
	type: Uint32Array,
	buffer: RingBuffer.getStorageForCapacity(4, Uint32Array),
});

const written = ringBuffer.push(new Uint32Array([1, 2, 3]));

const output = new Uint32Array(3);
const read = ringBuffer.pop(output);

console.log(written); // 3
console.log(read); // 3
console.log([...output]); // [1, 2, 3]
```

## API

### `RingBuffer.getStorageForCapacity(capacity, type)`

Allocates an `ArrayBuffer` large enough for `capacity` usable elements of the given typed-array constructor.

The implementation reserves one extra slot internally so it can distinguish a full buffer from an empty buffer.

### `new RingBuffer({ type, buffer })`

Creates a ring buffer over an existing `ArrayBuffer`.

`type` must be one of the standard typed-array constructors, such as `Uint8Array`, `Uint32Array`, `Float32Array`, or `Float64Array`.

### `push(elements, length?, offset?)`

Writes elements into the ring buffer and returns the number of elements written.

If there is not enough room, only the available space is written. `length` limits how many elements are read from `elements`; `offset` chooses the starting index in `elements`.

### `pop(elements, length?, offset?)`

Reads elements from the ring buffer into `elements` and returns the number of elements read.

If there is not enough data, only the available data is read. `length` limits how many elements are written; `offset` chooses the starting index in `elements`.

### State

- `capacity()` returns the usable capacity.
- `availableRead` returns the number of elements available to read.
- `availableWrite` returns the number of elements available to write.
- `isEmpty` is `true` when no elements are available to read.
- `isFull` is `true` when no elements are available to write.
- `clear()` marks the buffer empty without clearing the underlying storage.

## Scope

This package is useful when you need a compact FIFO queue over typed arrays in one JavaScript thread.

It is not a replacement for the original `ringbuf.js` if you need:

- communication between workers or AudioWorklets;
- `SharedArrayBuffer` support;
- wait-free producer/consumer behavior across threads;
- Web Audio helper utilities.

Use the original [`ringbuf.js`](https://github.com/padenot/ringbuf.js) for those cases.

## Development

```sh
npm test
npm run build
npm run lint
npm run format
```

## License

This project is licensed under the Mozilla Public License 2.0.

This project is a fork of [`ringbuf.js`](https://github.com/padenot/ringbuf.js) by Paul Adenot. Modifications in this fork are also distributed under the Mozilla Public License 2.0.
