'use client';

import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Plus,
  Pencil,
  Pin,
  CheckCheck,
  Save,
  Send,
  X,
  ExternalLink,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import {
  EMPTY_BOARD,
  sortItems,
  validateBoard,
  type BoardItem,
  type ClassBoard,
} from '@/lib/class-board.mjs';

type Snapshot = {
  published: ClassBoard;
  draft: ClassBoard;
  draftVersion: string;
  baseRevision: string;
  conflict: boolean;
  pending?: boolean;
};
const blankItem = (): BoardItem => {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    kind: 'homework',
    title: '',
    course: '',
    description: '',
    owner: '学习委员',
    dueAt: null,
    pinned: false,
    status: 'open',
    createdAt: now,
    updatedAt: now,
  };
};
const timeLabel = (v: string | null) =>
  v ? `${v.slice(0, 10)} ${v.slice(11, 16)}（北京时间）` : '未设截止时间';
const liveUrl = 'https://henryshih1211-ops.github.io/bio-class2/#tasks';

type PublishResult = {
  published: ClassBoard;
  draftVersion: string;
  commit: string;
};
async function api<T>(action: string, payload?: unknown): Promise<T> {
  const response = await fetch(
    `/__class-board/${action}`,
    payload === undefined
      ? { cache: 'no-store' }
      : {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Class-Board': 'local-owner',
          },
          body: JSON.stringify(payload),
        },
  );
  const result = await response.json();
  if (!response.ok)
    throw new Error(
      (result as { error?: string }).error || '操作失败，请稍后重试。',
    );
  return result as T;
}

export default function ManagePage() {
  const [state, setState] = useState<Snapshot | null>(null);
  const [draft, setDraft] = useState<ClassBoard>(EMPTY_BOARD);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState<BoardItem | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [reloadConfirm, setReloadConfirm] = useState(false);
  const [publishedRevision, setPublishedRevision] = useState('');

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    let cancelled = false;
    api<Snapshot>('state')
      .then((data) => {
        if (!cancelled) {
          setState(data);
          setDraft(data.draft);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  useEffect(() => {
    if (!publishedRevision) return;
    const abort = new AbortController();
    let attempts = 0;
    const check = async () => {
      try {
        const response = await fetch(
          'https://henryshih1211-ops.github.io/bio-class2/class-board.json',
          { cache: 'no-store', signal: abort.signal },
        );
        const board = validateBoard(await response.json());
        if (board.revision === publishedRevision) {
          setMessage('发布成功，已确认线上清单更新。全班现在可以查看。');
          clearInterval(timer);
        }
      } catch {
        /* A submitted update remains visible as pending until independently verified. */
      }
      if (++attempts >= 20) {
        clearInterval(timer);
        setMessage('发布已提交，线上更新尚未确认。请打开班级小站刷新查看。');
      }
    };
    const timer = setInterval(() => void check(), 15000);
    void check();
    return () => {
      abort.abort();
      clearInterval(timer);
    };
  }, [publishedRevision]);

  if (!import.meta.env.DEV)
    return (
      <main className="board-manager">
        <h1>班级发布台</h1>
        <p>本版由管理员在自己的电脑上发布。学习委员账号入口会在下一版提供。</p>
        <a href={liveUrl}>返回班级清单 →</a>
      </main>
    );

  const update = (items: BoardItem[]) => {
    setDraft({ ...draft, items });
    setDirty(true);
    setMessage('');
  };
  const save = async () => {
    if (!state) return null;
    const result = await api<{ draftVersion: string }>('save', {
      board: draft,
      draftVersion: state.draftVersion,
      baseRevision: state.baseRevision,
    });
    const next = { ...state, draft, draftVersion: result.draftVersion };
    setState(next);
    setDirty(false);
    setMessage('草稿已保存在这台电脑，尚未向全班发布。');
    return next;
  };
  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失败');
    } finally {
      setBusy(false);
    }
  };
  const changed =
    state &&
    (state.pending ||
      JSON.stringify(draft.items) !== JSON.stringify(state.published.items));

  return (
    <main className="board-manager">
      <a className="manager-back" href="/#tasks">
        <ArrowLeft size={16} />
        返回班级小站
      </a>
      <header className="manager-header">
        <div>
          <p className="eyebrow">26级生物科学类2班</p>
          <h1>班级发布台</h1>
          <p>把作业和班级事项整理好，再一次发布给全班。</p>
        </div>
        <a href={liveUrl} target="_blank" rel="noopener noreferrer">
          查看线上清单 <ExternalLink size={15} />
        </a>
      </header>
      <div className="manager-banner">
        <CheckCheck size={20} />
        <p>
          同学无需登录即可查看；只有这台电脑上的发布台能修改清单。
          <small>
            发布的内容可通过班级网址公开访问。“我已完成”由同学各自在本机标记。
          </small>
        </p>
      </div>
      {error && (
        <p role="alert" className="storage-error">
          {error}
        </p>
      )}
      {state?.pending && (
        <p className="board-warning">
          上次发布尚未全部完成。请核对清单后再次点击“预览并发布”，继续完成上线。
        </p>
      )}
      {state?.conflict && (
        <p role="alert" className="board-warning">
          线上清单已有更新，你的旧草稿仍保留。请先导出草稿，再重新读取并合并内容。
        </p>
      )}
      <output className="manager-message" aria-live="polite">
        {message ||
          (!state && !error
            ? '正在读取已发布清单与本机草稿…'
            : dirty
              ? '有尚未保存的修改'
              : '')}
      </output>
      <div className="manager-toolbar">
        <button
          type="button"
          className="primary-button"
          disabled={!state || busy}
          onClick={() => setEditing(blankItem())}
        >
          <Plus size={17} />
          添加事项
        </button>
        <div>
          <button
            type="button"
            className="manager-button"
            disabled={!state || busy || !dirty}
            onClick={() => void run(save)}
          >
            <Save size={16} />
            保存草稿
          </button>
          <button
            type="button"
            className="primary-button"
            disabled={!state || busy || !changed || state.conflict}
            onClick={() =>
              void run(async () => {
                await save();
                setConfirm(true);
              })
            }
          >
            <Send size={16} />
            预览并发布
          </button>
        </div>
      </div>
      <div className="manager-columns">
        {(['task', 'homework'] as const).map((kind) => (
          <section key={kind} className="manager-list">
            <h2>
              {kind === 'task' ? '班级待办' : '班级作业单'}
              <span>{draft.items.filter((v) => v.kind === kind).length}</span>
            </h2>
            {!draft.items.some((v) => v.kind === kind) && (
              <p className="manager-empty">
                暂无事项。点击“添加事项”开始填写。
              </p>
            )}
            {sortItems(draft.items.filter((v) => v.kind === kind)).map(
              (item) => (
                <article
                  className={`manager-card ${item.status === 'closed' ? 'manager-closed' : ''}`}
                  key={item.id}
                >
                  <div className="board-card-meta">
                    <span>{item.course || '班级事务'}</span>
                    {item.pinned && <Pin size={15} />}
                    <span>
                      {item.status === 'closed' ? '已结束' : '进行中'}
                    </span>
                  </div>
                  <h3>{item.title}</h3>
                  <p className="board-description">{item.description}</p>
                  <p className="manager-deadline">{timeLabel(item.dueAt)}</p>
                  <small>负责人：{item.owner}</small>
                  <div className="manager-card-actions">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setEditing({ ...item })}
                    >
                      <Pencil size={15} />
                      编辑
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        update(
                          draft.items.map((v) =>
                            v.id === item.id
                              ? {
                                  ...v,
                                  pinned: !v.pinned,
                                  updatedAt: new Date().toISOString(),
                                }
                              : v,
                          ),
                        )
                      }
                    >
                      <Pin size={15} />
                      {item.pinned ? '取消置顶' : '置顶'}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        update(
                          draft.items.map((v) =>
                            v.id === item.id
                              ? {
                                  ...v,
                                  status:
                                    v.status === 'open' ? 'closed' : 'open',
                                  updatedAt: new Date().toISOString(),
                                }
                              : v,
                          ),
                        )
                      }
                    >
                      {item.status === 'open' ? '结束事项' : '恢复进行中'}
                    </button>
                  </div>
                </article>
              ),
            )}
          </section>
        ))}
      </div>
      <p className="manager-note">
        草稿保存后不会自动发布。发布后通常需要等待网站更新，同学打开页面或点击刷新就能看到。附件上传将在后续版本补充。
      </p>
      <div className="manager-recovery">
        <button
          type="button"
          className="manager-button"
          disabled={!state || busy}
          onClick={() => {
            const url = URL.createObjectURL(
              new Blob([JSON.stringify(draft, null, 2)], {
                type: 'application/json',
              }),
            );
            const link = document.createElement('a');
            link.href = url;
            link.download = '生科2班清单草稿.json';
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          }}
        >
          导出草稿
        </button>
        <button
          type="button"
          className="manager-button"
          disabled={busy}
          onClick={() => setReloadConfirm(true)}
        >
          重新读取线上清单
        </button>
      </div>

      <Dialog
        open={reloadConfirm}
        onOpenChange={(open) => {
          if (!busy) setReloadConfirm(open);
        }}
      >
        <DialogContent className="profile-dialog manager-dialog">
          <DialogTitle>重新读取线上清单</DialogTitle>
          <DialogDescription>
            当前草稿会在这台电脑上保留备份，然后用线上清单重新开始编辑。需要带回其他修改时，请先导出草稿。
          </DialogDescription>
          {error && (
            <p role="alert" className="storage-error">
              {error}
            </p>
          )}
          <button
            type="button"
            className="primary-button"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                let current = state;
                if (!current) current = await api<Snapshot>('state');
                if (dirty && state) current = await save();
                const next = await api<Snapshot>('reload', {
                  draftVersion: current?.draftVersion,
                });
                setState(next);
                setDraft(next.draft);
                setDirty(false);
                setReloadConfirm(false);
                setMessage('已读取线上清单，旧草稿已备份。');
              })
            }
          >
            {busy ? '正在读取…' : '备份草稿并重新读取'}
          </button>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <DialogContent className="profile-dialog manager-dialog">
          <DialogTitle>
            {draft.items.some((v) => v.id === editing?.id)
              ? '编辑事项'
              : '添加事项'}
          </DialogTitle>
          <DialogDescription>
            先加入草稿，确认清单后再统一发布。
          </DialogDescription>
          {editing && (
            <form
              className="entry-form"
              onSubmit={(event) => {
                event.preventDefault();
                const item = {
                  ...editing,
                  updatedAt: new Date().toISOString(),
                };
                update(
                  draft.items.some((v) => v.id === item.id)
                    ? draft.items.map((v) => (v.id === item.id ? item : v))
                    : [...draft.items, item],
                );
                setEditing(null);
              }}
            >
              <label htmlFor="board-kind">类别</label>
              <select
                id="board-kind"
                value={editing.kind}
                onChange={(event) =>
                  setEditing({
                    ...editing,
                    kind: event.target.value as BoardItem['kind'],
                    owner:
                      event.target.value === 'homework' ? '学习委员' : '团支书',
                  })
                }
              >
                <option value="homework">班级作业</option>
                <option value="task">班级待办</option>
              </select>
              {editing.kind === 'homework' && (
                <>
                  <label htmlFor="board-course">课程</label>
                  <input
                    id="board-course"
                    value={editing.course}
                    maxLength={60}
                    required
                    placeholder="例如：普通生物学"
                    onChange={(event) =>
                      setEditing({ ...editing, course: event.target.value })
                    }
                  />
                </>
              )}
              <label htmlFor="board-title">标题</label>
              <input
                id="board-title"
                value={editing.title}
                maxLength={100}
                required
                placeholder="例如：第一章课后练习"
                onChange={(event) =>
                  setEditing({ ...editing, title: event.target.value })
                }
              />
              <label htmlFor="board-description">具体要求（选填）</label>
              <textarea
                id="board-description"
                value={editing.description}
                maxLength={2000}
                rows={4}
                placeholder="填写范围、提交方式和注意事项"
                onChange={(event) =>
                  setEditing({ ...editing, description: event.target.value })
                }
              />
              <label htmlFor="board-due">截止时间（北京时间，选填）</label>
              <input
                id="board-due"
                type="datetime-local"
                value={editing.dueAt?.slice(0, 16) || ''}
                onChange={(event) =>
                  setEditing({
                    ...editing,
                    dueAt: event.target.value
                      ? `${event.target.value}:00+08:00`
                      : null,
                  })
                }
              />
              <label htmlFor="board-owner">负责人</label>
              <input
                id="board-owner"
                maxLength={40}
                required
                value={editing.owner}
                onChange={(event) =>
                  setEditing({ ...editing, owner: event.target.value })
                }
              />
              <label className="manager-pin">
                <Checkbox
                  checked={editing.pinned}
                  onCheckedChange={(value) =>
                    setEditing({ ...editing, pinned: !!value })
                  }
                />
                置顶显示
              </label>
              <button
                type="submit"
                className="primary-button"
                disabled={
                  !editing.title.trim() ||
                  !editing.owner.trim() ||
                  (editing.kind === 'homework' && !editing.course.trim())
                }
              >
                <Plus size={16} />
                加入草稿
              </button>
            </form>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={confirm}
        onOpenChange={(open) => {
          if (!busy) setConfirm(open);
        }}
      >
        <DialogContent className="profile-dialog manager-dialog">
          <DialogTitle>发布前确认</DialogTitle>
          <DialogDescription>
            下面的清单会发布到班级网址，所有访问者都可以查看。
          </DialogDescription>
          <div className="manager-preview">
            {draft.items.map((item) => (
              <article key={item.id}>
                <span>
                  {item.kind === 'homework' ? item.course : '班级待办'} ·{' '}
                  {item.status === 'open' ? '进行中' : '已结束'}
                  {item.pinned ? ' · 置顶' : ''}
                </span>
                <h3>{item.title}</h3>
                <p className="board-description">{item.description}</p>
                <p>{timeLabel(item.dueAt)}</p>
                <small>负责人：{item.owner}</small>
              </article>
            ))}
          </div>
          {error && (
            <p role="alert" className="storage-error">
              {error}
            </p>
          )}
          <div className="manager-publish-actions">
            <button
              type="button"
              className="manager-button"
              disabled={busy}
              onClick={() => setConfirm(false)}
            >
              <X size={16} />
              返回修改
            </button>
            <button
              type="button"
              className="primary-button"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  const result = await api<PublishResult>('publish', {
                    draftVersion: state?.draftVersion,
                  });
                  setState({
                    published: result.published,
                    draft: result.published,
                    draftVersion: result.draftVersion,
                    baseRevision: result.published.revision,
                    conflict: false,
                  });
                  setDraft(result.published);
                  setDirty(false);
                  setConfirm(false);
                  setMessage('发布已提交，正在确认线上更新…');
                  setPublishedRevision(result.published.revision);
                })
              }
            >
              <Send size={16} />
              {busy ? '正在发布…' : '确认发布给全班'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
