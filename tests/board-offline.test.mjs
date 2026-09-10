import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { EMPTY_BOARD } from '../lib/class-board.mjs';

async function workerFixture() {
  const source = await readFile(
    new URL('../public/sw.js', import.meta.url),
    'utf8',
  );
  const listeners = {};
  const cached = new Map();
  const origin = 'https://example.invalid';
  let network = async () =>
    new Response(JSON.stringify(EMPTY_BOARD), {
      headers: { 'Content-Type': 'application/json' },
    });
  vm.runInNewContext(source, {
    URL,
    Response,
    Headers,
    Request,
    Promise,
    self: {
      location: {
        origin,
        href: `${origin}/bio-class2/sw.js`,
        toString() {
          return this.href;
        },
      },
      addEventListener: (name, listener) => {
        listeners[name] = listener;
      },
    },
    fetch: (...args) => network(...args),
    caches: {
      open: async () => ({
        put: async (request, response) =>
          cached.set(request.url, response.clone()),
        match: async (request) => cached.get(request.url)?.clone(),
      }),
    },
  });
  return {
    network: (fn) => {
      network = fn;
    },
    load: async (url = `${origin}/bio-class2/class-board.json`) => {
      let result;
      listeners.fetch({
        request: new Request(url),
        respondWith: (response) => {
          result = response;
        },
      });
      return await result;
    },
  };
}

test('fresh shared data is not reported as offline and later replaces the cached version', async () => {
  const fixture = await workerFixture();
  const fresh = await fixture.load();
  assert.equal(fresh.headers.get('X-Board-Offline'), null);
  assert.equal((await fresh.json()).revision, 'initial');
  fixture.network(
    async () =>
      new Response(
        JSON.stringify({ ...EMPTY_BOARD, revision: 'new-revision' }),
      ),
  );
  assert.equal((await (await fixture.load()).json()).revision, 'new-revision');
  fixture.network(async () => {
    throw Error('offline');
  });
  const offline = await fixture.load();
  assert.equal(offline.headers.get('X-Board-Offline'), 'true');
  assert.equal((await offline.json()).revision, 'new-revision');
});

test('offline without a copy returns a JSON error, never the app HTML or a fake empty list', async () => {
  const fixture = await workerFixture();
  fixture.network(async () => {
    throw Error('offline');
  });
  const response = await fixture.load();
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error, 'offline');
});

test('invalid network content keeps the prior shared copy and warns that it is offline', async () => {
  const fixture = await workerFixture();
  await fixture.load();
  fixture.network(
    async () => new Response('<html>deployment in progress</html>'),
  );
  const response = await fixture.load();
  assert.equal(response.headers.get('X-Board-Offline'), 'true');
  assert.equal((await response.json()).revision, 'initial');
  assert.equal(await fixture.load('https://other.invalid/anything'), undefined);
});
