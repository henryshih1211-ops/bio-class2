'use client';

import { useEffect, useState } from 'react';
import { BookCheck, Check, Plus, Trash2 } from 'lucide-react';
import { Empty } from '@/components/ui/empty';

type Homework = {
  id: string;
  course: string;
  detail: string;
  due: string;
  done: boolean;
};
const HOMEWORK_KEY = 'shengke2-homework-draft-v1';

export default function ClassHomework() {
  const [items, setItems] = useState<Homework[]>([]);
  const [course, setCourse] = useState('');
  const [detail, setDetail] = useState('');
  const [due, setDue] = useState('');
  const [ready, setReady] = useState(false);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HOMEWORK_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed))
          setItems(
            parsed.filter(
              (item) =>
                item &&
                typeof item.id === 'string' &&
                typeof item.course === 'string' &&
                typeof item.detail === 'string',
            ),
          );
      }
    } finally {
      setReady(true);
    }
  }, []);

  const save = (next: Homework[]) => {
    try {
      localStorage.setItem(HOMEWORK_KEY, JSON.stringify(next));
      setItems(next);
      setFeedback('作业草稿已保存在本机');
    } catch {
      setFeedback('保存失败，请检查浏览器存储设置。');
    }
  };

  return (
    <section className="class-homework" aria-labelledby="class-homework-title">
      <div className="class-homework-heading">
        <span>
          <BookCheck size={19} />
        </span>
        <div>
          <p className="eyebrow">班级作业单</p>
          <h3 id="class-homework-title">负责人发布草稿</h3>
        </div>
        <span className="draft-badge">本机版</span>
      </div>
      <p className="class-homework-intro">
        先记录课程作业与截止时间。后续接入负责人账号后，学习委员发布一次，全班即可同步查看。
      </p>
      {items.length === 0 && (
        <Empty className="homework-empty">
          <h3>还没有作业记录</h3>
          <p>可以先添加一条，试试作业单的使用方式。</p>
        </Empty>
      )}
      <div className="homework-list">
        {items.map((item) => (
          <article
            key={item.id}
            className={`homework-item${item.done ? ' done' : ''}`}
          >
            <button
              type="button"
              className="homework-check"
              aria-label={`${item.done ? '恢复' : '完成'}：${item.course}`}
              onClick={() =>
                save(
                  items.map((row) =>
                    row.id === item.id ? { ...row, done: !row.done } : row,
                  ),
                )
              }
            >
              <Check size={15} />
            </button>
            <div>
              <strong>{item.course}</strong>
              <p>{item.detail}</p>
              {item.due && <time>截止：{item.due}</time>}
            </div>
            <button
              type="button"
              className="homework-delete"
              aria-label={`删除：${item.course}`}
              onClick={() => save(items.filter((row) => row.id !== item.id))}
            >
              <Trash2 size={16} />
            </button>
          </article>
        ))}
      </div>
      <form
        className="entry-form homework-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!course.trim() || !detail.trim()) return;
          save([
            ...items,
            {
              id: crypto.randomUUID(),
              course: course.trim(),
              detail: detail.trim(),
              due,
              done: false,
            },
          ]);
          setCourse('');
          setDetail('');
          setDue('');
        }}
      >
        <label htmlFor="homework-course">课程</label>
        <input
          id="homework-course"
          maxLength={40}
          value={course}
          onChange={(event) => setCourse(event.target.value)}
          placeholder="例如：普通生物学"
          required
        />
        <label htmlFor="homework-detail">作业内容</label>
        <input
          id="homework-detail"
          maxLength={180}
          value={detail}
          onChange={(event) => setDetail(event.target.value)}
          placeholder="例如：完成第一章课后题"
          required
        />
        <div className="form-bottom">
          <label>
            截止日期（选填）
            <input
              type="date"
              value={due}
              onChange={(event) => setDue(event.target.value)}
            />
          </label>
          <button
            className="primary-button"
            disabled={!ready || !course.trim() || !detail.trim()}
          >
            <Plus size={16} />
            添加作业
          </button>
        </div>
      </form>
      <output className="homework-feedback" aria-live="polite">
        {feedback}
      </output>
    </section>
  );
}
