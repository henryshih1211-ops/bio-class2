'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BookCheck,
  UsersRound,
  RefreshCw,
  Pin,
  Clock3,
  CheckCheck,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Empty } from '@/components/ui/empty';
import {
  dueState,
  sortItems,
  validateBoard,
  type ClassBoard,
  type BoardItem,
} from '@/lib/class-board.mjs';

const CHECK_KEY = 'bio-class2-board-checks-v1';
const formatTime = (value: string) =>
  new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));

export default function SharedBoard() {
  const [board, setBoard] = useState<ClassBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [offline, setOffline] = useState(false);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [checksReady, setChecksReady] = useState(false);
  const [checkError, setCheckError] = useState('');
  const [filter, setFilter] = useState('open');
  const [course, setCourse] = useState('all');
  const [now, setNow] = useState<number | undefined>();
  const [legacy, setLegacy] = useState<
    { course: string; detail: string; due: string }[]
  >([]);
  const requestNumber = useRef(0);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    const requestId = ++requestNumber.current;
    const controller = new AbortController();
    const cancel = () => controller.abort();
    if (signal?.aborted) return;
    signal?.addEventListener('abort', cancel, { once: true });
    const timeout = setTimeout(cancel, 15000);
    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.BASE_URL}class-board.json`,
        { cache: 'no-store', signal: controller.signal },
      );
      if (!response.ok) throw Error();
      const next = validateBoard(await response.json());
      if (signal?.aborted || requestId !== requestNumber.current) return;
      setBoard(next);
      setOffline(response.headers.get('X-Board-Offline') === 'true');
      setError('');
    } catch (cause) {
      if (signal?.aborted || requestId !== requestNumber.current) return;
      setError(
        '暂时无法更新班级清单。请稍后重试；当前显示的内容可能不是最新版本。',
      );
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', cancel);
      if (!signal?.aborted && requestId === requestNumber.current)
        setLoading(false);
    }
  }, []);

  useEffect(() => {
    const abort = new AbortController();
    void refresh(abort.signal);
    const foreground = () => {
      if (document.visibilityState === 'visible') {
        setNow(Date.now());
        void refresh(abort.signal);
      }
    };
    const timer = setInterval(foreground, 60000);
    document.addEventListener('visibilitychange', foreground);
    window.addEventListener('online', foreground);
    window.addEventListener('focus', foreground);
    setNow(Date.now());
    try {
      const raw = localStorage.getItem(CHECK_KEY);
      if (raw) {
        const data: unknown = JSON.parse(raw);
        if (
          !data ||
          Array.isArray(data) ||
          typeof data !== 'object' ||
          Object.values(data).some((v) => typeof v !== 'boolean')
        )
          throw Error();
        setChecked(data as Record<string, boolean>);
      }
      setChecksReady(true);
    } catch {
      setCheckError('无法读取本机完成记录，暂时保留原记录。');
    }
    try {
      const old = JSON.parse(
        localStorage.getItem('shengke2-homework-draft-v1') || '[]',
      );
      if (Array.isArray(old))
        setLegacy(
          old.filter(
            (v) =>
              v && typeof v.course === 'string' && typeof v.detail === 'string',
          ),
        );
    } catch {
      /* Legacy storage is never modified or implicitly published. */
    }
    return () => {
      abort.abort();
      clearInterval(timer);
      document.removeEventListener('visibilitychange', foreground);
      window.removeEventListener('online', foreground);
      window.removeEventListener('focus', foreground);
    };
  }, [refresh]);

  function toggle(id: string, done: boolean) {
    const next = { ...checked, [id]: done };
    try {
      localStorage.setItem(CHECK_KEY, JSON.stringify(next));
      setChecked(next);
      setCheckError('');
    } catch {
      setCheckError('完成状态未保存，请检查浏览器存储。');
    }
  }

  const matches = (item: BoardItem) =>
    filter === 'closed'
      ? item.status === 'closed'
      : item.status === 'open' && (filter === 'all' || !checked[item.id]);
  const items = board?.items ?? [];
  const outstanding = items.filter(
    (v) => v.status === 'open' && !checked[v.id],
  ).length;
  const courses = [
    ...new Set(items.filter((v) => v.kind === 'homework').map((v) => v.course)),
  ].sort();

  return (
    <section className="shared-board" aria-label="班级共享清单">
      <header className="board-heading">
        <div>
          <p className="eyebrow">一起安排好</p>
          <h2>班级共享清单</h2>
        </div>
        <button
          type="button"
          className="board-refresh"
          onClick={() => void refresh()}
          disabled={loading}
          aria-label="刷新班级清单"
        >
          <RefreshCw size={17} className={loading ? 'board-spinning' : ''} />
        </button>
      </header>
      <div className="board-summary">
        <span>
          <CheckCheck size={17} />
          {outstanding}项待完成
        </span>
        <small>
          {loading
            ? '正在更新…'
            : offline
              ? '离线内容'
              : board?.updatedAt
                ? `更新于 ${formatTime(board.updatedAt)}`
                : board
                  ? '已连接班级清单'
                  : '尚未连接'}
        </small>
      </div>
      {error && (
        <p className="board-warning" role="alert">
          {error}
        </p>
      )}
      {offline && (
        <p className="board-warning">
          当前显示上次保存的班级清单，联网后会重新更新。
        </p>
      )}
      {checkError && (
        <p className="board-warning" role="alert">
          {checkError}
        </p>
      )}
      <div className="board-filters" aria-label="筛选班级事项">
        {[
          ['open', '待完成'],
          ['all', '全部进行中'],
          ['closed', '已结束'],
        ].map(([value, label]) => (
          <button
            type="button"
            key={value}
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>
      {(['task', 'homework'] as const).map((kind) => {
        const visible = sortItems(
          items.filter(
            (v) =>
              v.kind === kind &&
              matches(v) &&
              (kind === 'task' || course === 'all' || v.course === course),
          ),
        );
        const Icon = kind === 'task' ? UsersRound : BookCheck;
        return (
          <section
            className="board-section"
            key={kind}
            aria-label={kind === 'task' ? '班级待办' : '班级作业单'}
          >
            <header>
              <h3>
                <Icon size={19} />
                {kind === 'task' ? '班级待办' : '班级作业单'}
              </h3>
              <span>{visible.length}项</span>
            </header>
            {kind === 'homework' && courses.length > 0 && (
              <label className="board-course-filter">
                课程
                <select
                  value={course}
                  onChange={(event) => setCourse(event.target.value)}
                >
                  <option value="all">全部课程</option>
                  {courses.map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
            )}
            {visible.length === 0 && (
              <Empty className="board-empty">
                <Icon size={24} />
                <h4>
                  {loading && !board
                    ? '正在读取班级清单'
                    : !board
                      ? '班级清单暂未读取成功'
                      : items.some((v) => v.kind === kind)
                        ? '这里暂时没有符合条件的事项'
                        : kind === 'homework'
                          ? '还没有发布作业'
                          : '还没有发布班级待办'}
                </h4>
                <p>
                  {!board && error
                    ? '点击右上角刷新后重试。'
                    : '负责人发布后，同学们将在这里看到。'}
                </p>
              </Empty>
            )}
            {visible.map((item) => {
              const status = dueState(item, now);
              return (
                <article
                  className={`board-card ${checked[item.id] ? 'board-done' : ''}`}
                  key={item.id}
                >
                  <div className="board-card-meta">
                    <span>
                      {item.kind === 'homework' ? item.course : '班级事务'}
                    </span>
                    {item.pinned && (
                      <span className="board-pin">
                        <Pin size={13} />
                        置顶
                      </span>
                    )}
                  </div>
                  <h4>{item.title}</h4>
                  {item.description && (
                    <p className="board-description">{item.description}</p>
                  )}
                  <div className={`board-deadline ${status.tone}`}>
                    <Clock3 size={15} />
                    <span>
                      {item.dueAt
                        ? `${formatTime(item.dueAt)} 截止`
                        : status.label}
                    </span>
                  </div>
                  {item.dueAt && (
                    <p className={`board-status ${status.tone}`}>
                      {status.label}
                    </p>
                  )}
                  <div className="board-card-footer">
                    <span>
                      负责人：{item.owner}
                      <small>发布于 {formatTime(item.createdAt)}</small>
                    </span>
                    {item.status === 'open' ? (
                      <label className="board-check">
                        <Checkbox
                          checked={!!checked[item.id]}
                          disabled={!checksReady}
                          onCheckedChange={(value) => toggle(item.id, !!value)}
                          aria-label={`我已完成：${item.title}`}
                        />
                        <span>我已完成</span>
                      </label>
                    ) : (
                      <span className="board-ended">已结束</span>
                    )}
                  </div>
                </article>
              );
            })}
          </section>
        );
      })}
      <p className="board-footnote">
        “我已完成”仅记在本机，不会改变其他同学的状态。清单每分钟检查更新。
      </p>
      {legacy.length > 0 && (
        <details className="board-legacy">
          <summary>以前的本机作业草稿 · {legacy.length}条</summary>
          <p>这些草稿已保留，没有自动向全班发布。</p>
          {legacy.map((item, index) => (
            <article key={index}>
              <strong>{item.course}</strong>
              <p>{item.detail}</p>
              {item.due && <small>{item.due}</small>}
            </article>
          ))}
        </details>
      )}
      {import.meta.env.DEV && (
        <a href="/manage/" className="board-manage-link">
          进入班级发布台 →
        </a>
      )}
    </section>
  );
}
