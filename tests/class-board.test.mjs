import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  rm,
  readdir,
} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {
  createPublisher,
  trustedLocalRequest,
} from '../scripts/board-publisher.mjs';
import {
  EMPTY_BOARD,
  validateBoard,
  dueState,
  sortItems,
} from '../lib/class-board.mjs';

const exec = promisify(execFile);
test('HTTP publication interrupted after source update resumes the same revision', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'bio-board-http-test-'));
  const data = new Map([
    ['s0', { 'public/class-board.json': structuredClone(EMPTY_BOARD) }],
    ['p0', { 'class-board.json': structuredClone(EMPTY_BOARD) }],
  ]);
  let source = 's0',
    pages = 'p0',
    index = 0,
    fail = true;
  const transport = {
    heads: async () => ({ source, pages }),
    read: async (ref, file) => data.get(ref)[file],
    commit: async (parent, file, text) => {
      const sha = `commit_${++index}`;
      data.set(sha, { ...data.get(parent), [file]: JSON.parse(text) });
      return sha;
    },
    update: async (branch, sha) => {
      if (branch === 'main') source = sha;
      else {
        if (fail) {
          fail = false;
          throw Error('connection lost');
        }
        pages = sha;
      }
    },
  };
  try {
    await mkdir(path.join(root, 'public'));
    const publisher = createPublisher(root, 'origin', transport);
    const initial = await publisher.snapshot();
    const draft = { ...initial.draft, items: [sample()] };
    const saved = await publisher.save({
      board: draft,
      draftVersion: initial.draftVersion,
      baseRevision: initial.baseRevision,
    });
    await assert.rejects(() => publisher.publish(saved), /connection lost/);
    const revision = data.get(source)['public/class-board.json'].revision;
    const restarted = createPublisher(root, 'origin', transport);
    const pending = await restarted.snapshot();
    assert.equal(pending.pending, true);
    assert.equal(pending.conflict, false);
    const result = await restarted.publish({
      draftVersion: pending.draftVersion,
    });
    assert.equal(result.published.revision, revision);
    assert.equal(data.get(pages)['class-board.json'].revision, revision);
    assert.equal((await restarted.snapshot()).pending, false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
const sample = (id = 'assignment_1') => ({
  id,
  kind: 'homework',
  title: '测试作业（不会发布到真实网站）',
  description: '课后练习一',
  course: '测试课程',
  owner: '学习委员',
  dueAt: '2026-09-11T12:00:00+08:00',
  pinned: false,
  status: 'open',
  createdAt: '2026-09-10T04:00:00.000Z',
  updatedAt: '2026-09-10T04:00:00.000Z',
});

test('validates input, rejects malformed dates and duplicate IDs, strips unknown fields', () => {
  assert.equal(
    validateBoard({
      ...EMPTY_BOARD,
      items: [{ ...sample(), secret: 'never publish' }],
    }).items[0].secret,
    undefined,
  );
  assert.throws(
    () => validateBoard({ ...EMPTY_BOARD, items: [sample(), sample()] }),
    /编号/,
  );
  assert.throws(
    () =>
      validateBoard({
        ...EMPTY_BOARD,
        items: [{ ...sample(), dueAt: '2026-02-30T12:00:00+08:00' }],
      }),
    /日期/,
  );
  assert.throws(
    () =>
      validateBoard({ ...EMPTY_BOARD, items: [{ ...sample(), title: ' ' }] }),
    /完整填写/,
  );
  assert.throws(
    () => validateBoard({ ...EMPTY_BOARD, classId: 'another-class' }),
    /格式/,
  );
  assert.throws(
    () =>
      validateBoard({ ...EMPTY_BOARD, items: [{ ...sample(), course: '' }] }),
    /完整填写/,
  );
});

test('uses explicit China deadline time, status and pin priority', () => {
  const item = sample();
  assert.equal(
    dueState(item, Date.parse('2026-09-11T04:01:00Z')).tone,
    'overdue',
  );
  assert.equal(dueState(item, Date.parse('2026-09-11T03:59:00Z')).tone, 'soon');
  assert.equal(dueState({ ...item, status: 'closed' }).tone, 'closed');
  assert.equal(
    sortItems([item, { ...sample('pinned'), pinned: true, dueAt: null }])[0].id,
    'pinned',
  );
});

test('local publisher rejects remote, cross-origin, DNS rebinding and cross-site requests', () => {
  const req = {
    socket: { remoteAddress: '127.0.0.1' },
    headers: {
      host: 'localhost:3000',
      origin: 'http://localhost:3000',
      'sec-fetch-site': 'same-origin',
    },
  };
  assert.equal(trustedLocalRequest(req), true);
  assert.equal(
    trustedLocalRequest({ ...req, socket: { remoteAddress: '192.168.1.4' } }),
    false,
  );
  assert.equal(
    trustedLocalRequest({
      ...req,
      headers: { ...req.headers, origin: 'https://evil.invalid' },
    }),
    false,
  );
  assert.equal(
    trustedLocalRequest({ ...req, headers: { host: 'evil.invalid:3000' } }),
    false,
  );
  assert.equal(
    trustedLocalRequest({
      ...req,
      headers: { ...req.headers, 'sec-fetch-site': 'cross-site' },
    }),
    false,
  );
});

test('publish is shared, persistent, preserves other files, and rejects concurrent changes', async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), 'bio-board-test-'));
  const upstream = path.join(tmp, 'upstream.git');
  const root = path.join(tmp, 'owner');
  const git = async (cwd, ...args) =>
    (await exec('git', args, { cwd })).stdout.trim();
  try {
    await mkdir(root);
    await git(tmp, 'init', '--bare', upstream);
    await git(root, 'init', '-b', 'main');
    await git(root, 'config', 'user.name', 'Board Test');
    await git(root, 'config', 'user.email', 'test@example.invalid');
    await mkdir(path.join(root, 'public'));
    await writeFile(
      path.join(root, 'public/class-board.json'),
      JSON.stringify(EMPTY_BOARD),
    );
    await writeFile(path.join(root, 'index.html'), 'existing site');
    await git(root, 'add', '.');
    await git(root, 'commit', '-m', 'fixture');
    await git(root, 'branch', 'gh-pages');
    await git(root, 'remote', 'add', 'origin', upstream);
    await git(root, 'push', 'origin', 'main', 'gh-pages');
    await writeFile(path.join(root, 'index.html'), 'unrelated local edit');
    const beforeIndex = await git(root, 'write-tree');
    const publisher = createPublisher(root, 'origin');
    const original = await publisher.snapshot();
    const draft = {
      ...original.draft,
      items: [
        sample(),
        {
          ...sample('task_1'),
          kind: 'task',
          course: '',
          title: '班级测试任务',
        },
      ],
    };
    const saved = await publisher.save({
      board: draft,
      draftVersion: original.draftVersion,
      baseRevision: original.baseRevision,
    });
    assert.equal(
      (await publisher.snapshot()).published.items.length,
      0,
      'saving a draft must not publish',
    );
    await assert.rejects(
      () =>
        publisher.save({
          board: draft,
          draftVersion: original.draftVersion,
          baseRevision: original.baseRevision,
        }),
      /另一个窗口/,
    );
    const published = await publisher.publish(saved);
    const remoteSource = JSON.parse(
      await git(upstream, 'show', 'main:public/class-board.json'),
    );
    const remotePages = JSON.parse(
      await git(upstream, 'show', 'gh-pages:class-board.json'),
    );
    assert.deepEqual(
      remoteSource,
      remotePages,
      'source and reader receive identical data',
    );
    assert.equal(remotePages.items.length, 2);
    assert.equal(remotePages.revision, published.published.revision);
    assert.equal(
      await git(upstream, 'show', 'gh-pages:index.html'),
      'existing site',
    );
    assert.equal(
      await readFile(path.join(root, 'index.html'), 'utf8'),
      'unrelated local edit',
    );
    assert.equal(
      await git(root, 'write-tree'),
      beforeIndex,
      'owner index must not change',
    );
    const head = await git(upstream, 'rev-parse', 'gh-pages');
    assert.equal(
      (await publisher.publish(saved)).commit,
      head,
      'retry must not republish',
    );
    const restarted = createPublisher(root, 'origin');
    const afterRestart = await restarted.snapshot();
    assert.deepEqual(
      afterRestart.published,
      remotePages,
      'restarting preserves published records',
    );
    const secondOwner = createPublisher(root, 'origin');
    const stale = await secondOwner.snapshot();
    const edit = {
      ...stale.draft,
      items: stale.draft.items.map((v) => ({
        ...v,
        title: '本机尚未发布修改',
      })),
    };
    const editVersion = await secondOwner.save({
      board: edit,
      draftVersion: stale.draftVersion,
      baseRevision: stale.baseRevision,
    });
    // Simulate an independent publisher updating the remote source from another checkout.
    const other = path.join(tmp, 'other');
    await git(tmp, 'clone', '-b', 'main', upstream, other);
    await git(other, 'config', 'user.name', 'Other');
    await git(other, 'config', 'user.email', 'other@example.invalid');
    await writeFile(
      path.join(other, 'public/class-board.json'),
      JSON.stringify({ ...remoteSource, revision: 'newer-remote' }),
    );
    await git(other, 'add', '.');
    await git(other, 'commit', '-m', 'concurrent edit');
    await git(other, 'push', 'origin', 'main');
    await assert.rejects(
      () => secondOwner.publish(editVersion),
      /线上清单已有新版本/,
    );
    assert.equal((await secondOwner.snapshot()).conflict, true);
    const reloaded = await secondOwner.reload(editVersion);
    assert.equal(reloaded.draft.revision, 'newer-remote');
    assert.equal(reloaded.conflict, false);
    assert.equal(
      (await readdir(path.join(root, '.local-board/backups'))).length,
      1,
      'conflicted draft retained as backup',
    );
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});
