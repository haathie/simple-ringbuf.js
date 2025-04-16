# `ringbuf.js`

[![test](https://github.com/padenot/ringbuf.js/actions/workflows/test.yml/badge.svg)](https://github.com/padenot/ringbuf.js/actions/workflows/test.yml)
[![npm](https://img.shields.io/npm/v/ringbuf.js)](https://www.npmjs.com/package/ringbuf.js)


A thread-safe wait-free single-consumer single-producer ring buffer for the web,
and some utilities.

The main files of this library:

- `src/ringbuf.ts`: base data structure, implementing the ring-buffer. This is
  intentionally heavily commented.
- `src/audioqueue.ts`: wrapper for audio data streaming, without using
  `postMessage`.
- `src/param.ts`: wrapper for parameter changes, allowing to send pairs of index
  and value without using `postMessage`.

## Examples and use-cases

<https://ringbuf-js.netlify.app/> is a deployment of the examples in this
repository with a web server that answers with the right headers for this
directory, and allows the example to work. More details available at [Planned
changes to shared memory
](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer/Planned_changes).

Those examples work in browsers that support both the `AudioWorklet`, and
`SharedArrayBuffer`.

While most real-time audio work should happen on a real-time thread (which means
inside the `AudioWorkletGlobaleScope` on the Web), sending (resp. receiving) audio
to (from) a non-real-time thread is useful:

- Decoding a audio codecs that browsers don't support natively in a web worker,
  sending the PCM to an `AudioWorklet` (no need to fiddle with
  `AudioBufferSourceNode`, etc.)
- Conversely, recording the output of an `AudioContext` using an
  `AudioWorkletNode` with a very high degree of reliability and extreme
  flexibility, possibly using Web Codecs or a WASM based solution for the
  encoding, and then sending the result to the network or storing it locally.
- Implementing emulators for (e.g.) old consoles that only had one execution
  thread and did everything on the same CPU
- Porting code that is using a push-style audio API (`SDL_QueueAudio`) without
  having to refactor everything.
- Implement off-main-thread off-real-time-thread audio analysis (streaming the
  real-time audio data to a web worker, visualizing it using an
  `OffscreenCanvas`, shielding the audio processing and visualization from main
  thread load)

## Run locally

> `cd public; node ../server.mjs`

This is a simple web server that sets the right headers to use
`SharedArrayBuffer` (see [Planned changes to shared memory
](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer/Planned_changes)
on MDN).

## Contribute

Please do (just open an issue or send a PR).

> make build

allows running the build step and copying the file to allow the example to work.

> make doc

allows rebuilding the documentation.

## Performance Benchmarks

As of version `0.4.0`, the whole codebase has been ported to TypeScript, tooling
has been modernized and dependencies were updated. The package is now also
marked as side-effect free, which allows bundlers to tree-shake the code for
unused symbols when imported.

Alongside these updates, two performance optimizations were introduced:

- `_copy` has been optimized by a loop factor of 16.
[`bench`](bench/deinterleave-bench.html)
- `deinterleave` has been optimized by unrolling the loop with a factor of 4.
[`bench`](bench/copy-bench.html)

Early, and limited test results have shown a substantial performance improvement
in buffer copying by **~325%**. For ongoing monitoring in engine behaviour,
benchmarks have been added for independent verification of the results.

## Compatibility

This needs the `SharedArrayBuffer`, so a couple of HTTP headers might need to be
set on the web server serving the page.

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

As of 2023-05-25, the following browsers are compatible:

- Firefox Desktop all current versions including current ESR
- Firefox for Android all current versions
- Chrome Desktop and Chromium-based browsers (for a long time)
- Chrome for Android
- Safari

## License

Mozilla Public License 2.0
