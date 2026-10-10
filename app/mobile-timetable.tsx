'use client';

import { useState } from 'react';
import { type Course, courseTime, weekDate, winterPeriods } from '@/lib/courses';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const dayNames = ['周一', '周二', '周三', '周四', '周五'];
const shortNames: Record<string, string> = {
  '人工智能导论与大模型应用': '人工智能导论与大模型应用',
  '职业生涯规划指导（一）——学业规划': '职业生涯规划',
  '大学英语一（读写）': '大学英语·读写',
  '大学英语一（视听说）': '大学英语·视听说',
  '教师职业技能训练': '教师职业技能训练',
};
function shortRoom(course: Course) {
  if (course.pending) return '地点待定';
  if (course.name === '教师职业技能训练') return '训练中心·分组';
  return course.room.replace('教室', '').replace('（二）', '②');
}

export default function MobileTimetable({ week, courses }: { week: number; courses: Course[] }) {
  const [selected, setSelected] = useState<Course | null>(null);
  const weekend = courses.filter(c => c.day > 5);
  return (
    <div className="mobile-timetable">
      <p className="timetable-hint">五天同屏 · 点击课程查看完整信息</p>
      <div className="timetable-grid" aria-label={`第${week}周周一至周五课表`}>
        <div className="timetable-corner">节次</div>
        {dayNames.map((day, i) => (
          <div className="timetable-day" key={day} style={{ gridColumn: i + 2, gridRow: 1 }}>
            <strong>{day}</strong><span>{weekDate(week, i).replace('月', '/').replace('日', '')}</span>
          </div>
        ))}
        {winterPeriods.map(([start, end], i) => (
          <div className="timetable-period" key={start} style={{ gridColumn: 1, gridRow: i + 2 }}>
            <strong>{i + 1}</strong><span>{start}</span><span>{end}</span>
          </div>
        ))}
        {dayNames.flatMap((_, day) => winterPeriods.map((_, period) => (
          <div className={`timetable-cell ${period === 4 || period === 8 ? 'session-start' : ''}`} key={`${day}-${period}`} style={{ gridColumn: day + 2, gridRow: period + 2 }} aria-hidden="true" />
        )))}
        {courses.filter(c => c.day <= 5).map(c => (
          <button key={c.id} className={`timetable-course ${c.kind}${c.pending ? ' pending' : ''}`}
            style={{ gridColumn: c.day + 1, gridRow: `${c.start + 1} / span ${c.end - c.start + 1}` }}
            onClick={() => setSelected(c)}
            aria-label={`${dayNames[c.day - 1]} ${c.start}至${c.end}节 ${c.name} ${courseTime(c.start, c.end)} ${c.room}${c.pending ? '，周次待确认' : ''}`}>
            <strong>{shortNames[c.name] || c.name.replace('(一)*', '（一）')}</strong>
            <span>{shortRoom(c)}</span>
            {(c.odd || c.pending) && <small>{c.pending ? '周次待确认' : '单周'}</small>}
          </button>
        ))}
      </div>
      <div className="timetable-weekend">
        {weekend.length ? <>
          <h3>周末课程</h3>
          <div className="timetable-weekend-list">
            {weekend.map(c => <button key={c.id} onClick={() => setSelected(c)}>
              <strong>{c.day === 6 ? '周六' : '周日'} · {c.name}</strong>
              <span>{c.start}—{c.end}节 · {courseTime(c.start, c.end)}</span>
              <small>{shortRoom(c)}</small>
            </button>)}
          </div>
        </> : '周六、周日暂无排课'}
      </div>
      <Dialog open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        <DialogContent className="timetable-detail">
          <DialogTitle>{selected?.name}</DialogTitle>
          <DialogDescription>{selected && `${dayNames[selected.day - 1] || (selected.day === 6 ? '周六' : '周日')} · ${selected.start}—${selected.end}节 · 冬季作息`}</DialogDescription>
          {selected && <dl>
            <div><dt>时间</dt><dd>{courseTime(selected.start, selected.end)}</dd></div>
            <div><dt>地点</dt><dd>{selected.room}</dd></div>
            <div><dt>教师</dt><dd>{selected.teacher}</dd></div>
            <div><dt>周次</dt><dd>{selected.pending ? '待学校确认（暂在第4—19周显示体育板块）' : selected.weeks ? `第${selected.weeks.join('、')}周` : `第${selected.from}—${selected.to}周${selected.odd ? '，单周' : ''}`}</dd></div>
          </dl>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
