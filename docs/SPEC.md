# RingBuffer ArrayBuffer Port Spec

## Summary

Port `src/ringbuf.ts` from a thread-safe `SharedArrayBuffer` ring buffer to a single-threaded `ArrayBuffer` ring buffer.

This is a **breaking change**. The new implementation does not provide cross-thread synchronization, does not use `Atomics`, and does not store read/write pointers inside the backing buffer.

## Goals

- Replace `SharedArrayBuffer` storage with `ArrayBuffer`.
- Remove thread-safety requirements and all `Atomics` usage.
- Store read/write pointers as ordinary instance fields.
- Add an O(1) `clear()` method that makes the buffer logically empty.
- Preserve the existing ring-buffer push/pop behavior for single-threaded use.
- Keep the one-empty-slot invariant used to distinguish full from empty.

## Non-Goals

- Do not preserve thread-safe producer/consumer behavior.
- Do not support sharing one backing buffer across multiple threads.
- Do not zero memory when clearing.
- Do not change tests as part of this spec.

## Breaking Changes

### Storage Type

`RingBuffer.getStorageForCapacity(...)` now returns `ArrayBuffer` instead of `SharedArrayBuffer`.

**Before:**

```ts
const sab = RingBuffer.getStorageForCapacity(capacity, Float32Array);
const rb = new RingBuffer(sab, Float32Array);
```

**After:**

```ts
const buffer = RingBuffer.getStorageForCapacity(capacity, Float32Array);
const rb = new RingBuffer(buffer, Float32Array);
```

### Constructor

The constructor now accepts an `ArrayBuffer`.

```ts
constructor(buffer: ArrayBuffer, type: TypedArrayConstructor)
```

Passing a `SharedArrayBuffer` is no longer part of the supported API.

### Thread Safety

The ring buffer is no longer thread-safe.

The implementation must not use:

```ts
Atomics.load(...)
Atomics.store(...)
```

Pointer state is local to the `RingBuffer` instance.

### Buffer Layout

The backing buffer no longer reserves the first 8 bytes for shared read/write pointers.

Old layout:

```text
byte 0..3   write pointer
byte 4..7   read pointer
byte 8..    ring storage
```

New layout:

```text
byte 0..    ring storage
```

## Public API

### `RingBuffer.getStorageForCapacity`

```ts
static getStorageForCapacity(
  capacity: number,
  type: TypedArrayConstructor,
): ArrayBuffer
```

Returns an `ArrayBuffer` large enough to store `capacity` usable elements plus one sentinel slot.

Required allocation size:

```ts
(capacity + 1) * type.BYTES_PER_ELEMENT;
```

The extra slot preserves the existing full/empty distinction.

### `constructor`

```ts
constructor(buffer: ArrayBuffer, type: TypedArrayConstructor)
```

Initializes a ring buffer over the given `ArrayBuffer`.

The physical storage capacity is:

```ts
buffer.byteLength / type.BYTES_PER_ELEMENT;
```

The usable capacity remains:

```ts
physicalCapacity - 1;
```

The constructor initializes:

```ts
this.read_ptr = 0;
this.write_ptr = 0;
this.storage = new type(buffer, 0, physicalCapacity);
```

### `clear`

```ts
clear(): void
```

Makes the ring buffer logically empty in O(1).

Required behavior:

```ts
this.read_ptr = this.write_ptr;
```

After `clear()`:

```ts
rb.empty() === true;
rb.full() === false;
rb.availableRead() === 0;
rb.availableWrite() === rb.capacity();
```

`clear()` must not overwrite, zero, or reallocate the backing storage.

## Internal State

Replace the current pointer views:

```ts
private write_ptr: Uint32Array;
private read_ptr: Uint32Array;
```

With ordinary numeric fields:

```ts
private write_ptr = 0;
private read_ptr = 0;
```

The backing buffer field should become:

```ts
private buf: ArrayBuffer;
```

## Method Behavior

### `push`

`push(...)` should keep the current behavior, except pointer reads and writes use local numeric fields.

Pointer reads:

```ts
const rd = this.read_ptr;
const wr = this.write_ptr;
```

Pointer update:

```ts
this.write_ptr = (wr + to_write) % this._storage_capacity();
```

### `pop`

`pop(...)` should keep the current behavior, except pointer reads and writes use local numeric fields.

Pointer reads:

```ts
const rd = this.read_ptr;
const wr = this.write_ptr;
```

Pointer update:

```ts
this.read_ptr = (rd + to_read) % this._storage_capacity();
```

### `writeCallback`

remove it

### `writeCallbackWithOffset`

remove it

### `full`

Uses local fields:

```ts
return (this.write_ptr + 1) % this._storage_capacity() === this.read_ptr;
```

### `availableRead`

Uses local fields:

```ts
return this._available_read(this.read_ptr, this.write_ptr);
```

### `availableWrite`

Uses local fields:

```ts
return this._available_write(this.read_ptr, this.write_ptr);
```

## Documentation Updates

Update comments in `src/ringbuf.ts` to remove claims that the class is:

- thread-safe
- wait-free
- safe for producer/consumer use across threads
- backed by `SharedArrayBuffer`

Update docs to describe it as a single-threaded typed-array ring buffer.

## Compatibility Aliases

Keep the existing deprecated aliases unless separately removed:

```ts
available_read();
available_write();
```

They should continue to delegate to:

```ts
availableRead();
availableWrite();
```

## Test Scope

Tests are intentionally out of scope for this change request.

When tests are updated later, coverage should include:

- construction with `ArrayBuffer`
- push/pop behavior
- wraparound behavior
- full/empty behavior
- `availableRead()`
- `availableWrite()`
- `writeCallback()`
- `writeCallbackWithOffset()`
- `clear()` on empty buffer
- `clear()` after writing
- `clear()` after wraparound
