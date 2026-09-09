'use client';
import { useEffect, useState } from 'react';
import { CheckCheck, Link2, ArrowUpRight, Plus } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Empty } from '@/components/ui/empty';
import type { PersonalSummary } from './mobile-profile';
import ClassHomework from './class-homework';
type Task = { id: string; title: string; due: string; done: boolean };
type Link = { id: string; title: string; url: string };
const KEY = 'shengke2-personal-v1';
export function safeUrl(value: string) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}
export default function Personal({
  onSummaryChange,
}: {
  onSummaryChange: (summary: PersonalSummary) => void;
}) {
  const [tasks, setTasks] = useState<Task[]>([]),
    [links, setLinks] = useState<Link[]>([]);
  const [ready, setReady] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const [title, setTitle] = useState(''),
    [due, setDue] = useState(''),
    [linkTitle, setLinkTitle] = useState(''),
    [url, setUrl] = useState('');
  useEffect(() => {
    if (ready)
      onSummaryChange({
        pending: tasks.filter((t) => !t.done).length,
        completed: tasks.filter((t) => t.done).length,
        links: links.length,
      });
  }, [tasks, links, ready, onSummaryChange]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (
          !Array.isArray(data.tasks) ||
          !Array.isArray(data.links) ||
          !data.tasks.every(
            (t: Task) =>
              typeof t.id === 'string' &&
              typeof t.title === 'string' &&
              typeof t.due === 'string' &&
              typeof t.done === 'boolean',
          ) ||
          !data.links.every(
            (l: Link) =>
              typeof l.id === 'string' &&
              typeof l.title === 'string' &&
              typeof l.url === 'string' &&
              safeUrl(l.url),
          )
        )
          throw Error();
        setTasks(data.tasks);
        setLinks(data.links);
      }
      setReady(true);
    } catch {
      setError(
        '无法读取本地记录。为保护原有内容，暂不覆盖保存；请检查浏览器的存储设置。',
      );
    }
  }, []);
  function save(nextTasks: Task[], nextLinks: Link[]) {
    try {
      localStorage.setItem(
        KEY,
        JSON.stringify({ tasks: nextTasks, links: nextLinks }),
      );
      setTasks(nextTasks);
      setLinks(nextLinks);
      setError('');
      return true;
    } catch {
      setError('保存失败，浏览器存储可能已满或被禁用。请保留输入内容后重试。');
      return false;
    }
  }
  return (
    <section id="personal" className="personal-area" aria-label="个人工作区">
      <div className="personal-heading">
        <p className="eyebrow personal-mobile-title">26级生物科学类2班</p>
        <h2>
          <span className="personal-desktop-title">我的工作区</span>
          <span className="personal-mobile-title">待办</span>
        </h2>
        <p>我的记录仅保存在当前浏览器 · 换设备不会同步</p>
      </div>
      {error && (
        <p role="alert" className="storage-error">
          {error}
        </p>
      )}
      <p className="sr-only" role="status">
        {notice}
      </p>
      <div className="personal-grid">
        <section id="tasks" className="panel personal-panel">
          <div className="section-heading">
            <div>
              <CheckCheck size={20} />
              <h2>我的待办</h2>
            </div>
            <span className="muted">
              {tasks.filter((t) => !t.done).length}项未完成
            </span>
          </div>
          <div className="personal-body">
            {tasks.length === 0 && (
              <Empty className="personal-empty">
                <h3>还没有待办</h3>
                <p>把需要跟进的班务、作业记在这里。</p>
              </Empty>
            )}
            <div className="task-list">
              {tasks.map((t) => (
                <label
                  key={t.id}
                  className={'task-row ' + (t.done ? 'done' : '')}
                >
                  <Checkbox
                    checked={t.done}
                    onCheckedChange={(checked) => {
                      if (
                        save(
                          tasks.map((item) =>
                            item.id === t.id
                              ? { ...item, done: !!checked }
                              : item,
                          ),
                          links,
                        )
                      )
                        setNotice(checked ? '已标记完成' : '已恢复为未完成');
                    }}
                    aria-label={'标记完成：' + t.title}
                  />
                  <span>
                    <span className="task-title">{t.title}</span>
                    {t.due && (
                      <span className="task-due">截止日期：{t.due}</span>
                    )}
                  </span>
                </label>
              ))}
            </div>
            <form
              className="entry-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (!title.trim()) return;
                if (
                  save(
                    [
                      ...tasks,
                      {
                        id: crypto.randomUUID(),
                        title: title.trim(),
                        due,
                        done: false,
                      },
                    ],
                    links,
                  )
                ) {
                  setTitle('');
                  setDue('');
                  setNotice('待办已保存在当前浏览器');
                }
              }}
            >
              <label htmlFor="task-title">待办内容</label>
              <input
                id="task-title"
                maxLength={160}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例如：确认英语分班安排"
                required
              />
              <div className="form-bottom">
                <label>
                  截止日期（选填）
                  <input
                    type="date"
                    value={due}
                    onChange={(e) => setDue(e.target.value)}
                  />
                </label>
                <button
                  className="primary-button"
                  disabled={!ready || !title.trim()}
                >
                  <Plus size={16} />
                  添加待办
                </button>
              </div>
            </form>
            <section className="mobile-class-todos" aria-label="班级待办">
              <div>
                <p className="eyebrow">班级待办</p>
                <h3>班级任务</h3>
              </div>
              <p>班委后续发布的班级待办，会统一显示在这里。</p>
            </section>
            <ClassHomework />
          </div>
        </section>
        <section id="resources" className="panel personal-panel">
          <div className="section-heading">
            <div>
              <Link2 size={20} />
              <h2>常用内务网站</h2>
            </div>
            <span className="muted">官方入口 + 我的收藏</span>
          </div>
          <div className="personal-body">
            <div className="resource-list official-resources">
              <a
                href="https://www.lfnu.edu.cn/jwc/"
                target="_blank"
                rel="noopener noreferrer"
                className="resource"
              >
                <span>
                  廊坊师范学院教务处<small>官方公开入口 · lfnu.edu.cn</small>
                </span>
                <ArrowUpRight size={19} />
              </a>
              <a
                href="https://www.lfnu.edu.cn/smkxxy/"
                target="_blank"
                rel="noopener noreferrer"
                className="resource"
              >
                <span>
                  生命科学学院<small>学院官网 · lfnu.edu.cn</small>
                </span>
                <ArrowUpRight size={19} />
              </a>
            </div>
            {links.length === 0 && (
              <Empty className="personal-empty">
                <h3>添加你的其他常用网站</h3>
                <p>
                  学生教务登录地址尚未从学校公开页面确认，拿到准确网址后可以加在这里。
                </p>
              </Empty>
            )}
            <div className="resource-list">
              {links.map((l) => (
                <a
                  key={l.id}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="resource"
                >
                  <span>
                    {l.title}
                    <small>{new URL(l.url).hostname}</small>
                  </span>
                  <ArrowUpRight size={19} />
                </a>
              ))}
            </div>
            <form
              className="entry-form"
              onSubmit={(e) => {
                e.preventDefault();
                const valid = safeUrl(url);
                if (!valid) {
                  setError(
                    '请填写完整的 http:// 或 https:// 网站地址，不要包含账号密码。',
                  );
                  return;
                }
                if (!linkTitle.trim()) return;
                if (
                  save(tasks, [
                    ...links,
                    {
                      id: crypto.randomUUID(),
                      title: linkTitle.trim(),
                      url: valid,
                    },
                  ])
                ) {
                  setLinkTitle('');
                  setUrl('');
                  setNotice('入口已保存在当前浏览器');
                }
              }}
            >
              <label htmlFor="link-name">入口名称</label>
              <input
                id="link-name"
                maxLength={60}
                value={linkTitle}
                onChange={(e) => setLinkTitle(e.target.value)}
                placeholder="例如：学生教务系统"
                required
              />
              <label htmlFor="link-url">网站地址</label>
              <input
                id="link-url"
                type="url"
                maxLength={2000}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://"
                required
              />
              <button
                className="primary-button"
                disabled={!ready || !linkTitle.trim() || !url.trim()}
              >
                <Plus size={16} />
                添加入口
              </button>
            </form>
          </div>
        </section>
      </div>
    </section>
  );
}
