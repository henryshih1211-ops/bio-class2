'use client';
import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Sprout, CalendarDays, BookOpen, Info } from 'lucide-react';
import { activeCourses, weekDate, currentWeek } from '@/lib/courses';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Empty } from '@/components/ui/empty';
import Personal from './personal';
import PwaInstaller from './pwa-installer';
import MobileNav from './mobile-nav';
import { flushSync } from 'react-dom';
import { registerWeekTool } from '@/lib/webmcp';

export default function Home() {
  const [week, setWeek] = useState(1);
  useEffect(()=>setWeek(currentWeek()),[]);
  useEffect(()=>registerWeekTool(value=>flushSync(()=>setWeek(value))),[]);
  const active = activeCourses(week);
  return <main className="shell">
    <header className="topbar"><a href="./" className="brand"><span className="logo"><Sprout size={25}/></span><span>生科2班 <span className="brand-light">/ 本周</span></span></a><span className="term">2026 — 2027 · 第一学期</span></header>
    <section className="intro"><div><p className="eyebrow">26级生物科学类2班</p><h1>把这一周，安排明白。</h1></div><div className="semester"><span className="status-dot"/>9月7日开学 · 共20个教学周</div></section>
    <PwaInstaller />
    <div className="workspace"><section id="schedule" className="schedule panel"><div className="section-heading"><div><CalendarDays size={20}/><h2>本周课表</h2></div><button className="text-button" onClick={()=>setWeek(currentWeek())}>回到本周</button></div>
      <div className="weekbar"><div><p className="week-title">第 <strong>{String(week).padStart(2,'0')}</strong> 周</p><p className="muted">{weekDate(week)} — {weekDate(week,6)}</p></div><div className="week-controls"><button className="icon-button" aria-label="上一周" disabled={week===1} onClick={()=>setWeek(week-1)}><ChevronLeft size={18}/></button><Select value={String(week)} onValueChange={v=>v&&setWeek(Number(v))}><SelectTrigger aria-label="选择教学周" className="week-select"><SelectValue>{'第'+week+'周'}</SelectValue></SelectTrigger><SelectContent>{Array.from({length:20},(_,i)=><SelectItem key={i} value={String(i+1)}>第{i+1}周</SelectItem>)}</SelectContent></Select><button className="icon-button" aria-label="下一周" disabled={week===20} onClick={()=>setWeek(week+1)}><ChevronRight size={18}/></button></div></div>
      {active.length===0&&<Empty className="quiet"><BookOpen size={30}/><h3>{week===2||week===3?'本周为军事训练周':'本周暂无已排定的固定课程'}</h3><p>{week===2||week===3?'第2—3周军事训练，侯永刚老师负责。具体时间、地点待学校通知。':week<4?'原始课表中的固定课堂教学从第4周开始，请留意学校后续通知。':'原始课表未列出本周的固定课程，请留意学校的考试及其他安排。'}</p>{week<4&&<button className="primary-button" onClick={()=>setWeek(4)}>查看第4周课表 <ChevronRight size={16}/></button>}</Empty>}
      {active.length>0&&<div className="days">{['周一','周二','周三','周四','周五','周六','周日'].map((day,i)=><section key={day} className="day"><header><h3>{day}</h3><span>{weekDate(week,i)}</span></header>{active.filter(c=>c.day===i+1).map(c=><article className={'course '+c.kind} key={c.id}><div className="course-meta"><span>{c.start===c.end?c.start:c.start+'–'+c.end}节</span>{c.odd&&<span>单周</span>}</div><h4>{c.name}</h4><p>{c.room}</p><p className="teacher">{c.teacher}</p></article>)}{!active.some(c=>c.day===i+1)&&<p className="no-class">暂无排课</p>}</section>)}</div>}
      <div className="schedule-note"><Info size={17}/><p>英语：周三7–8节、周五3–4节；体育：周四3–4节。分班、周次及地点待确认，未计入上方课表。节次对应的钟点时间尚未提供。</p></div>
    </section><aside className="side"><section className="panel note-panel"><p className="eyebrow">学期备忘</p><h2>开学前，先看这里</h2><div className="memo"><span>01</span><div><h3>第2—3周 · 军事训练</h3><p>具体集合安排以学校通知为准。</p></div></div><div className="memo"><span>02</span><div><h3>第4周 · 固定课程开始</h3><p>劳动教育只安排在周五第5节。</p></div></div><div className="memo"><span>03</span><div><h3>部分课程按周变化</h3><p>切换周次查看，避免把整个学期的课程当成每周都有。</p></div></div></section><section className="panel provenance"><h2>关于这份课表</h2><p>仅包含二班相关课程，保留二班参与的合班课。未收录姓名名单、学号或团员证件。</p><p className="muted">依据你提供的学校课表整理。调课与临时安排以学校最新通知为准。</p><div className="data-label">27条排课记录 · 含3条待定板块与1条军训</div></section></aside></div>
    <Personal/>
    <footer>生科2班 · 本周<span>班级小站 / 第一版</span></footer>
    <MobileNav />
  </main>;
}
