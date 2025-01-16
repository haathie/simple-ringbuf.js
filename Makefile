all: doc build

doc: src/audioqueue.ts src/index.ts src/param.ts src/ringbuf.ts
	node node_modules/typedoc/bin/typedoc --out public/doc --readme README.md src/**/*.ts

build:
	npm run build

check: build
	node tests/test.mjs

lint:
	npm run lint
