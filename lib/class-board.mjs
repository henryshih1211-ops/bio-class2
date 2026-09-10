/** Shared JSON is the published source of truth; personal checkmarks are device-local. */
export const CLASS_ID = 'bio-class2';
export const EMPTY_BOARD = {
  schemaVersion: 1,
  classId: CLASS_ID,
  revision: 'initial',
  updatedAt: null,
  items: [],
};

export function validateBoard(value) {
  const fail = (message) => {
    throw new Error(message);
  };
  if (
    !value ||
    value.schemaVersion !== 1 ||
    value.classId !== CLASS_ID ||
    typeof value.revision !== 'string' ||
    !value.revision ||
    value.revision.length > 100 ||
    !Array.isArray(value.items) ||
    value.items.length > 300
  )
    fail('班级清单格式不正确。');
  const timestamp = (v) =>
    typeof v === 'string' &&
    /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(v) &&
    Number.isFinite(Date.parse(v));
  if (value.updatedAt !== null && !timestamp(value.updatedAt))
    fail('更新时间不正确。');
  const ids = new Set();
  const text = (v, length, required = true) =>
    typeof v === 'string' &&
    v.length <= length &&
    (!required || v.trim().length > 0);
  const items = value.items.map((item) => {
    if (
      !item ||
      !text(item.id, 100) ||
      !/^[a-zA-Z0-9_-]+$/.test(item.id) ||
      ['__proto__', 'constructor', 'prototype'].includes(item.id) ||
      ids.has(item.id)
    )
      fail('任务编号重复或无效。');
    ids.add(item.id);
    if (
      !['homework', 'task'].includes(item.kind) ||
      !['open', 'closed'].includes(item.status)
    )
      fail('任务类别或状态不正确。');
    if (
      !text(item.title, 100) ||
      !text(item.description, 2000, false) ||
      !text(item.course, 60, item.kind === 'homework') ||
      !text(item.owner, 40) ||
      typeof item.pinned !== 'boolean'
    )
      fail('请完整填写标题、课程和负责人，并检查文字长度。');
    if (
      !timestamp(item.createdAt) ||
      !timestamp(item.updatedAt) ||
      Date.parse(item.updatedAt) < Date.parse(item.createdAt)
    )
      fail('任务时间不正确。');
    if (item.dueAt !== null) {
      if (
        typeof item.dueAt !== 'string' ||
        !/^\d{4}-\d\d-\d\dT\d\d:\d\d:00\+08:00$/.test(item.dueAt) ||
        !Number.isFinite(Date.parse(item.dueAt))
      )
        fail('截止时间不正确。');
      const roundTrip = new Date(Date.parse(item.dueAt) + 8 * 3600000)
        .toISOString()
        .slice(0, 16);
      if (roundTrip !== item.dueAt.slice(0, 16)) fail('截止日期不存在。');
    }
    return {
      id: item.id,
      kind: item.kind,
      title: item.title.trim(),
      description: item.description.trim(),
      course: item.course.trim(),
      owner: item.owner.trim(),
      dueAt: item.dueAt,
      status: item.status,
      pinned: item.pinned,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  });
  return {
    schemaVersion: 1,
    classId: CLASS_ID,
    revision: value.revision,
    updatedAt: value.updatedAt,
    items,
  };
}

export function dueState(item, now = Date.now()) {
  if (item.status === 'closed') return { label: '已结束', tone: 'closed' };
  if (!item.dueAt) return { label: '未设截止时间', tone: 'normal' };
  const delta = Date.parse(item.dueAt) - now;
  if (delta < 0) return { label: '已过截止时间', tone: 'overdue' };
  if (delta <= 86400000) return { label: '24小时内截止', tone: 'soon' };
  return { label: '进行中', tone: 'normal' };
}

export function sortItems(items) {
  return [...items].sort(
    (a, b) =>
      Number(b.pinned) - Number(a.pinned) ||
      (a.dueAt ? Date.parse(a.dueAt) : Infinity) -
        (b.dueAt ? Date.parse(b.dueAt) : Infinity) ||
      Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );
}
