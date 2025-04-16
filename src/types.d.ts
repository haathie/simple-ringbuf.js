/**
 * Represents a base constructor type for typed arrays.
 * This type defines the various constructor signatures that typed arrays can have.
 * 
 * @template T - The specific typed array type (e.g., Int8Array, Uint8Array).
 */
export type TypedArrayConstructorBase<T> = {
  /**
   * Constructs a new typed array with no elements.
   * @returns A new typed array instance.
   */
  new (): T;

  /**
   * Constructs a new typed array with the specified length.
   * @param length - The length of the new typed array.
   * @returns A new typed array instance.
   */
  new (length: number): T;

  /**
   * Constructs a new typed array from an array-like or iterable object.
   * @param typedArray - An array-like or iterable object to initialize the typed array.
   * @returns A new typed array instance.
   */
  new (typedArray: ArrayLike<number> | Iterable<number>): T;

  /**
   * Constructs a new typed array from an object.
   * @param object - An object to initialize the typed array.
   * @returns A new typed array instance.
   */
  new (object: object): T;

  /**
   * Constructs a new typed array from an ArrayBuffer.
   * @param buffer - The ArrayBuffer to use as the storage for the typed array.
   * @returns A new typed array instance.
   */
  new (buffer: ArrayBufferLike): T;

  /**
   * Constructs a new typed array from an ArrayBuffer with a specified byte offset.
   * @param buffer - The ArrayBuffer to use as the storage for the typed array.
   * @param byteOffset - The offset, in bytes, to the first element in the array.
   * @returns A new typed array instance.
   */
  new (buffer: ArrayBufferLike, byteOffset: number): T;

  /**
   * Constructs a new typed array from an ArrayBuffer with a specified byte offset and length.
   * @param buffer - The ArrayBuffer to use as the storage for the typed array.
   * @param byteOffset - The offset, in bytes, to the first element in the array.
   * @param length - The number of elements in the array.
   * @returns A new typed array instance.
   */
  new (buffer: ArrayBufferLike, byteOffset: number, length: number): T;

  /**
   * The number of bytes per element in the typed array.
   */
  BYTES_PER_ELEMENT: number;
};

/**
 * Represents a constructor type for various typed arrays.
 * This type is a union of constructors for different typed arrays
 * such as Int8Array, Uint8Array, Uint8ClampedArray, Int16Array, Uint16Array,
 * Int32Array, Uint32Array, Float32Array, and Float64Array.
 */
export type TypedArrayConstructor =
  | TypedArrayConstructorBase<Int8Array>
  | TypedArrayConstructorBase<Uint8Array>
  | TypedArrayConstructorBase<Uint8ClampedArray>
  | TypedArrayConstructorBase<Int16Array>
  | TypedArrayConstructorBase<Uint16Array>
  | TypedArrayConstructorBase<Int32Array>
  | TypedArrayConstructorBase<Uint32Array>
  | TypedArrayConstructorBase<Float32Array>
  | TypedArrayConstructorBase<Float64Array>;

/**
 * Represents a union type for various typed arrays.
 * This type includes all standard typed arrays such as:
 * - Int8Array: An array of 8-bit signed integers.
 * - Uint8Array: An array of 8-bit unsigned integers.
 * - Uint8ClampedArray: An array of 8-bit unsigned integers clamped to 0-255.
 * - Int16Array: An array of 16-bit signed integers.
 * - Uint16Array: An array of 16-bit unsigned integers.
 * - Int32Array: An array of 32-bit signed integers.
 * - Uint32Array: An array of 32-bit unsigned integers.
 * - Float32Array: An array of 32-bit floating point numbers.
 * - Float64Array: An array of 64-bit floating point numbers.
 */
export type TypedArray = 
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array;

  /**
   * Represents a callback function used in the writeCallback method of the RingBuffer class.
   * This callback is responsible for writing data to two separate storage buffers.
   * 
   * @param storageA - The first storage buffer as a typed array.
   * @param storageB - The second storage buffer as a typed array.
   * @returns The number of elements that have been written to the storage buffers.
   */
  export type RingBufferWriteCallback = (storageA: TypedArray, storageB: TypedArray) => number;
  
  /**
   * Represents a callback function used in the writeCallbackWithOffset method of the RingBuffer class.
   * This callback is responsible for writing data to the ring buffer at specified offsets.
   * 
   * @param storage - The internal storage of the ring buffer as a typed array.
   * @param offsetStartWritingFrom - The offset to start writing from in the storage.
   * @param numElementsToWriteAtOffset - The number of elements to write at the first offset.
   * @param offsetStartWritingFromB - The second offset to start writing from in the storage.
   * @param numElementsToWriteAtOffsetB - The number of elements to write at the second offset.
   * @returns The number of elements that have been written to the storage.
   */
  export type RingBufferWriteCallbackWithOffset = (
    storage: TypedArray, 
    offsetStartWritingFrom: number, 
    numElementsToWriteAtOffset: number, 
    offsetStartWritingFromB: number, 
    numElementsToWriteAtOffsetB: number
  ) => number;