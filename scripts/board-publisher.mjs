import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  mkdtemp,
  rm,
  readFile,
  writeFile,
  mkdir,
  rename,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { EMPTY_BOARD, validateBoard } from '../lib/class-board.mjs';
import { githubTransport } from './board-github.mjs';

const exec = promisify(execFile);
const SOURCE_PATH = 'public/class-board.json';
const PAGES_PATH = 'class-board.json';

export function createPublisher(root, remote = 'github', transportOverride) {
  const draftPath = path.join(root, '.local-board', 'draft.json');
  let busy = false;
  let transport = transportOverride;
  let transportResolved = !!transportOverride;
  const git = async (args, env = {}) =>
    (
      await exec('git', args, {
        cwd: root,
        env: { ...process.env, ...env },
        maxBuffer: 4 * 1024 * 1024,
        timeout: 60000,
      })
    ).stdout.trim();
  async function exclusive(action) {
    if (busy) throw new Error('另一项保存或发布正在进行，请稍后重试。');
    busy = true;
    try {
      return await action();
    } finally {
      busy = false;
    }
  }
  async function fetchHeads() {
    if (!transportResolved) {
      const remoteUrl = await git(['remote', 'get-url', remote]);
      if (remoteUrl === 'https://github.com/henryshih1211-ops/bio-class2.git')
        transport = githubTransport(root);
      transportResolved = true;
    }
    if (transport) return transport.heads();
    await git([
      'fetch',
      remote,
      `main:refs/remotes/${remote}/main`,
      `gh-pages:refs/remotes/${remote}/gh-pages`,
    ]);
    return {
      source: await git(['rev-parse', `${remote}/main`]),
      pages: await git(['rev-parse', `${remote}/gh-pages`]),
    };
  }
  async function readBoard(ref, file) {
    if (transport)
      return validateBoard(
        (await transport.read(ref, file)) ?? structuredClone(EMPTY_BOARD),
      );
    const exists = await git(['ls-tree', '--name-only', ref, '--', file]);
    return exists
      ? validateBoard(JSON.parse(await git(['show', `${ref}:${file}`])))
      : structuredClone(EMPTY_BOARD);
  }
  async function readDraft() {
    try {
      return JSON.parse(await readFile(draftPath, 'utf8'));
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      throw new Error('本机草稿无法读取，已保留原文件，请先检查。');
    }
  }
  async function writeDraft(draft) {
    await mkdir(path.dirname(draftPath), { recursive: true });
    const temporary = `${draftPath}.${randomUUID()}.tmp`;
    await writeFile(temporary, JSON.stringify(draft, null, 2) + '\n', {
      mode: 0o600,
    });
    await rename(temporary, draftPath);
  }
  async function snapshot() {
    const heads = await fetchHeads();
    const published = await readBoard(heads.source, SOURCE_PATH);
    const pages = await readBoard(heads.pages, PAGES_PATH);
    let saved = await readDraft();
    if (
      saved &&
      saved.board.revision === published.revision &&
      JSON.stringify(saved.board.items) === JSON.stringify(published.items) &&
      saved.baseRevision !== published.revision
    ) {
      saved = { ...saved, baseRevision: published.revision };
      await writeDraft(saved);
    }
    return {
      published,
      draft: saved?.board ?? published,
      draftVersion: saved?.draftVersion ?? 'none',
      baseRevision: saved?.baseRevision ?? published.revision,
      conflict: !!saved && saved.baseRevision !== published.revision,
      pending: pages.revision !== published.revision,
    };
  }
  async function commitBoard(parent, file, text, label, temporary) {
    if (transport) return transport.commit(parent, file, text, label);
    const index = path.join(temporary, randomUUID());
    const env = { GIT_INDEX_FILE: index };
    await git(['read-tree', parent], env);
    const blobFile = path.join(temporary, randomUUID());
    await writeFile(blobFile, text);
    const blob = await git(['hash-object', '-w', blobFile]);
    await git(
      ['update-index', '--add', '--cacheinfo', `100644,${blob},${file}`],
      env,
    );
    const tree = await git(['write-tree'], env);
    return git(['commit-tree', tree, '-p', parent, '-m', label]);
  }
  return {
    snapshot: () => exclusive(snapshot),
    reload: (payload) =>
      exclusive(async () => {
        const saved = await readDraft();
        if ((saved?.draftVersion ?? 'none') !== payload.draftVersion)
          throw new Error('另一个窗口更新了草稿，请先刷新发布台。');
        const heads = await fetchHeads();
        const published = await readBoard(heads.source, SOURCE_PATH);
        if (saved) {
          const backupDir = path.join(root, '.local-board', 'backups');
          await mkdir(backupDir, { recursive: true });
          await writeFile(
            path.join(backupDir, `${randomUUID()}.json`),
            JSON.stringify(saved, null, 2),
            { mode: 0o600 },
          );
        }
        const draftVersion = randomUUID();
        await writeDraft({
          board: published,
          baseRevision: published.revision,
          draftVersion,
        });
        return {
          published,
          draft: published,
          draftVersion,
          baseRevision: published.revision,
          conflict: false,
        };
      }),
    save: (payload) =>
      exclusive(async () => {
        const board = validateBoard(payload.board);
        if (typeof payload.baseRevision !== 'string')
          throw new Error('缺少已发布版本，请重新打开发布台。');
        const saved = await readDraft();
        if ((saved?.draftVersion ?? 'none') !== payload.draftVersion)
          throw new Error('另一个窗口修改了草稿。请重新读取，再合并你的修改。');
        const draftVersion = randomUUID();
        await writeDraft({
          board,
          baseRevision: payload.baseRevision,
          draftVersion,
        });
        return { draftVersion };
      }),
    publish: (payload) =>
      exclusive(async () => {
        const saved = await readDraft();
        if (!saved || saved.draftVersion !== payload.draftVersion)
          throw new Error('草稿版本已变化，请重新保存并预览。');
        const heads = await fetchHeads();
        const published = await readBoard(heads.source, SOURCE_PATH);
        const draft = validateBoard(saved.board);
        // Reconcile a retry after a successful push whose HTTP response was lost.
        if (
          published.revision === draft.revision &&
          JSON.stringify(published.items) === JSON.stringify(draft.items)
        ) {
          // Resume a partially completed HTTP publication without losing the source update.
          let commit = heads.pages;
          const pages = await readBoard(heads.pages, PAGES_PATH);
          if (transport && pages.revision !== published.revision) {
            commit = await transport.commit(
              heads.pages,
              PAGES_PATH,
              JSON.stringify(published, null, 2) + '\n',
              'Complete class shared board publication',
            );
            await transport.update('gh-pages', commit);
          }
          await writeDraft({
            ...saved,
            board: published,
            baseRevision: published.revision,
          });
          await writeFile(
            path.join(root, SOURCE_PATH),
            JSON.stringify(published, null, 2) + '\n',
          );
          return {
            published,
            draftVersion: saved.draftVersion,
            commit,
          };
        }
        if (published.revision !== saved.baseRevision)
          throw new Error(
            '线上清单已有新版本。为避免覆盖，请重新读取并合并修改后再发布。',
          );
        if (JSON.stringify(draft.items) === JSON.stringify(published.items))
          throw new Error('草稿与已发布清单一致，无需重复发布。');
        const next = validateBoard({
          ...draft,
          revision: randomUUID(),
          updatedAt: new Date().toISOString(),
        });
        const temporary = await mkdtemp(
          path.join(tmpdir(), 'bio-board-publish-'),
        );
        try {
          const text = JSON.stringify(next, null, 2) + '\n';
          const sourceCommit = await commitBoard(
            heads.source,
            SOURCE_PATH,
            text,
            'Update class shared board',
            temporary,
          );
          const pagesCommit = await commitBoard(
            heads.pages,
            PAGES_PATH,
            text,
            'Publish class shared board',
            temporary,
          );
          // Keep recovery metadata before the network write; retries can identify the exact revision.
          await writeDraft({ ...saved, board: next });
          if (transport) {
            await transport.update('main', sourceCommit);
            await transport.update('gh-pages', pagesCommit);
          } else
            await git([
              'push',
              '--atomic',
              remote,
              `${sourceCommit}:refs/heads/main`,
              `${pagesCommit}:refs/heads/gh-pages`,
            ]);
          await writeDraft({
            board: next,
            baseRevision: next.revision,
            draftVersion: saved.draftVersion,
          });
          await writeFile(path.join(root, SOURCE_PATH), text);
          return {
            published: next,
            draftVersion: saved.draftVersion,
            commit: pagesCommit,
          };
        } finally {
          await rm(temporary, { recursive: true, force: true });
        }
      }),
  };
}

// All writes stay on the owner's loopback-only development server.
export function trustedLocalRequest(request) {
  const remote = request.socket.remoteAddress;
  if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(remote)) return false;
  const host = request.headers.host || '';
  if (!/^(localhost|127\.0\.0\.1|\[::1\]):\d+$/.test(host)) return false;
  if (request.headers.origin && request.headers.origin !== `http://${host}`)
    return false;
  if (
    request.headers['sec-fetch-site'] &&
    !['same-origin', 'none'].includes(request.headers['sec-fetch-site'])
  )
    return false;
  return true;
}

export function boardPublisherPlugin() {
  return {
    name: 'local-class-board-publisher',
    apply: 'serve',
    configureServer(server) {
      const publisher = createPublisher(server.config.root);
      server.middlewares.use(async (request, response, next) => {
        const url = new URL(request.url || '/', 'http://localhost');
        if (!url.pathname.startsWith('/__class-board/')) return next();
        response.setHeader('Content-Type', 'application/json; charset=utf-8');
        response.setHeader('Cache-Control', 'no-store');
        const send = (status, data) => {
          response.statusCode = status;
          response.end(JSON.stringify(data));
        };
        if (!trustedLocalRequest(request))
          return send(403, { error: '发布台仅允许在管理员电脑本机访问。' });
        try {
          if (
            request.method === 'GET' &&
            url.pathname === '/__class-board/state'
          )
            return send(200, await publisher.snapshot());
          if (
            request.method !== 'POST' ||
            ![
              '/__class-board/save',
              '/__class-board/publish',
              '/__class-board/reload',
            ].includes(url.pathname)
          )
            return send(405, { error: '不支持的操作。' });
          if (
            request.headers['x-class-board'] !== 'local-owner' ||
            !String(request.headers['content-type']).startsWith(
              'application/json',
            )
          )
            return send(403, { error: '请求来源不正确。' });
          let body = '';
          let size = 0;
          for await (const chunk of request) {
            size += chunk.length;
            if (size > 512000)
              return send(413, { error: '清单过大，请减少内容。' });
            body += chunk;
          }
          const payload = JSON.parse(body);
          const result = url.pathname.endsWith('/save')
            ? await publisher.save(payload)
            : url.pathname.endsWith('/reload')
              ? await publisher.reload(payload)
              : await publisher.publish(payload);
          return send(200, result);
        } catch (error) {
          // Never send git output, credentials, environment variables or file paths to clients.
          const message =
            error instanceof SyntaxError
              ? '清单格式不正确。'
              : typeof error.code !== 'undefined' || error.cmd
                ? '暂时无法连接发布服务，请检查电脑网络和 GitHub 登录后重试。草稿仍保留。'
                : error.message || '操作失败，请稍后重试。';
          return send(409, { error: message });
        }
      });
    },
  };
}
