import { execFile } from 'node:child_process';

const REPOSITORY = 'henryshih1211-ops/bio-class2';
const API = `https://api.github.com/repos/${REPOSITORY}`;

// Reuse the owner's existing Git credential; never put it in a file or browser response.
function credential(root) {
  return new Promise((resolve, reject) => {
    const child = execFile(
      'git',
      ['credential', 'fill'],
      {
        cwd: root,
        timeout: 8000,
        env: {
          ...process.env,
          GIT_TERMINAL_PROMPT: '0',
          GIT_ASKPASS: '/usr/bin/false',
        },
      },
      (error, stdout) => {
        const token = /^password=(.+)$/m.exec(stdout)?.[1];
        if (error || !token)
          reject(
            new Error('请先在这台电脑登录 GitHub，再重新发布。草稿仍保留。'),
          );
        else resolve(token);
      },
    );
    child.stdin.end(
      `protocol=https\nhost=github.com\npath=${REPOSITORY}.git\n\n`,
    );
  });
}

export function githubTransport(root, options = {}) {
  let token;
  const fetchApi = options.fetch || fetch;
  async function request(resource, method = 'GET', body) {
    if (method !== 'GET' && !token)
      token = await (options.credential
        ? options.credential()
        : credential(root));
    const headers = {
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'bio-class2-publisher',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    let response;
    try {
      response = await fetchApi(`${API}${resource}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        redirect: 'error',
        signal: AbortSignal.timeout(20000),
      });
    } catch {
      throw new Error('暂时无法连接 GitHub，请检查网络后重试。草稿仍保留。');
    }
    if (!response.ok) {
      if (
        response.status === 404 &&
        method === 'GET' &&
        resource.startsWith('/contents/')
      )
        return null;
      if (response.status === 401 || response.status === 403) {
        token = undefined;
        throw new Error(
          'GitHub 未允许本次操作，请检查这台电脑的登录或稍后重试。',
        );
      }
      if (response.status === 422)
        throw new Error(
          '线上版本已变化，本次没有覆盖新的内容。请重新读取后重试。',
        );
      throw new Error('GitHub 暂时无法处理这次请求，请稍后重试。');
    }
    return response.json();
  }
  return {
    async heads() {
      const [source, pages] = await Promise.all([
        request('/git/ref/heads/main'),
        request('/git/ref/heads/gh-pages'),
      ]);
      return { source: source.object.sha, pages: pages.object.sha };
    },
    async read(ref, file) {
      const data = await request(
        `/contents/${file}?ref=${encodeURIComponent(ref)}`,
      );
      if (!data) return null;
      if (data.encoding !== 'base64' || typeof data.content !== 'string')
        throw new Error('无法读取线上清单内容。');
      return JSON.parse(Buffer.from(data.content, 'base64').toString('utf8'));
    },
    async commit(parent, file, text, message) {
      const parentData = await request(`/git/commits/${parent}`);
      const tree = await request('/git/trees', 'POST', {
        base_tree: parentData.tree.sha,
        tree: [{ path: file, mode: '100644', type: 'blob', content: text }],
      });
      const commit = await request('/git/commits', 'POST', {
        message,
        tree: tree.sha,
        parents: [parent],
      });
      return commit.sha;
    },
    async update(branch, sha) {
      if (!['main', 'gh-pages'].includes(branch))
        throw new Error('不支持的发布目标。');
      return request(`/git/refs/heads/${branch}`, 'PATCH', {
        sha,
        force: false,
      });
    },
  };
}
