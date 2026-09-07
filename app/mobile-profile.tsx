'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRight, Bookmark, BookOpen, CheckCheck, ChevronRight, CreditCard, GraduationCap, HeartHandshake, Info, ListTodo, Pencil, ShieldCheck, Smartphone, Sprout, UsersRound, Wrench } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';

export type PersonalSummary = { pending: number; completed: number; links: number };
const PROFILE_KEY = 'shengke2-profile-v1';
const initialProfile = { name: '', bio: '' };
const campusServices = [
  { id: 'study', title: '考试与成绩', subtitle: '选课 · 考试 · 学分', icon: GraduationCap, group: 'campus', items: ['教务系统与选课入口', '考试时间、地点与成绩查询', '培养方案与学分要求'], note: '学校教务系统入口尚未设置，考试与成绩以教务系统为准。' },
  { id: 'library', title: '图书馆', subtitle: '借阅 · 续借 · 自习', icon: BookOpen, group: 'campus', items: ['馆藏检索与借阅记录', '续借入口与还书日期', '开放时间与座位预约'], note: '待补充本校图书馆网址及实际提供的服务。' },
  { id: 'card', title: '校园卡', subtitle: '充值 · 挂失 · 缴费', icon: CreditCard, group: 'campus', items: ['校园卡官方服务入口', '挂失与补卡办理指南', '校园缴费渠道'], note: '此处暂不提供查询或支付，之后可连接学校的官方服务入口。' },
  { id: 'dorm', title: '宿舍生活', subtitle: '报修 · 水电 · 联系人', icon: Wrench, group: 'campus', items: ['宿舍报修入口', '水电费查询与缴费渠道', '宿管与后勤服务联系方式'], note: '待补充本校报修渠道、缴费方式和联系电话。' },
  { id: 'league', title: '班级与团务', subtitle: '班级待办 · 材料 · 团日', icon: UsersRound, group: 'class', items: ['班级事项与截止日期', '团关系转接材料清单', '团日活动安排与提交说明'], note: '班级共享待办与发布功能尚未接入，材料清单和活动安排后续填写。' },
  { id: 'activity', title: '活动与志愿', subtitle: '社团 · 志愿 · 第二课堂', icon: HeartHandshake, group: 'class', items: ['社团与校园活动报名入口', '志愿活动记录与时长查询入口', '第二课堂与活动证明'], note: '活动内容、志愿时长及认定规则待按本校实际情况补充。' },
] as const;
type ServiceId = typeof campusServices[number]['id'];

export default function MobileProfile({ summary }: { summary: PersonalSummary | null }) {
  const [profile, setProfile] = useState(initialProfile);
  const [draft, setDraft] = useState(initialProfile);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [panel, setPanel] = useState<'edit' | 'privacy' | 'about' | ServiceId | null>(null);
  const service = campusServices.find(item => item.id === panel);

  // Browser-only storage is read after hydration to preserve the static export.
  /* oxlint-disable react/react-compiler */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (!data || typeof data.name !== 'string' || typeof data.bio !== 'string') throw Error();
        setProfile({ name: data.name, bio: data.bio });
      }
      setReady(true);
    } catch {
      setError('暂时无法读取个人资料，请检查浏览器存储设置。');
    }
  }, []);
  /* oxlint-enable react/react-compiler */

  const edit = () => { setDraft(profile); setPanel('edit'); };
  const metrics = [
    { label: '待完成', value: summary?.pending, href: '#tasks' },
    { label: '已完成', value: summary?.completed, href: '#tasks' },
    { label: '常用网站', value: summary?.links, href: '#resources' },
  ];

  return (
    <section id="me" className="mobile-profile" aria-label="我的个人主页" tabIndex={-1}>
      <header className="profile-topline"><h2>我的</h2><span>生科2班</span></header>
      <div className="profile-identity">
        <div className="profile-avatar" aria-hidden="true">{profile.name ? Array.from(profile.name)[0] : <Sprout size={34} strokeWidth={1.5} />}</div>
        <h3>{profile.name || '你好，同学'}</h3>
        <p className="profile-class">26级生物科学类 · 2班</p>
        <p className="profile-bio">{profile.bio || '把自己的节奏，慢慢安排好。'}</p>
        <button type="button" className="profile-edit" onClick={edit} disabled={!ready}><Pencil size={14} />编辑资料</button>
      </div>

      <div className="profile-metrics" aria-label="我的记录概况">
        {metrics.map(item => <a key={item.label} href={item.href}><strong>{item.value ?? '—'}</strong><span>{item.label}</span></a>)}
      </div>
      {!summary && <p className="profile-data-note">待办概况以本机成功读取的记录为准。</p>}

      <section className="profile-group" aria-labelledby="profile-work-title">
        <h3 id="profile-work-title">我的日常</h3>
        <div className="profile-menu">
          <a href="#tasks" className="profile-row"><span className="profile-row-icon"><ListTodo size={20} /></span><span className="profile-row-copy">我的待办<small>把今天要做的事记下来</small></span><ChevronRight size={17} /></a>
          <a href="#resources" className="profile-row"><span className="profile-row-icon"><Bookmark size={20} /></span><span className="profile-row-copy">常用内务网站<small>教务、学习与班级常用入口</small></span><ChevronRight size={17} /></a>
        </div>
      </section>

      {(['campus', 'class'] as const).map(group => <section className="profile-group" key={group} aria-labelledby={`profile-${group}-title`}>
        <div className="profile-group-heading"><h3 id={`profile-${group}-title`}>{group === 'campus' ? '我的校园' : '班级与成长'}</h3><span>入口草稿</span></div>
        <div className="profile-campus-grid">{campusServices.filter(item => item.group === group).map(({ id, title, subtitle, icon: Icon }) => <button key={id} type="button" className="profile-campus-item" onClick={() => setPanel(id)}>
          <Icon size={23} strokeWidth={1.6} /><strong>{title}</strong><span>{subtitle}</span>
        </button>)}</div>
      </section>)}

      <section className="profile-group" aria-labelledby="profile-settings-title">
        <h3 id="profile-settings-title">个人设置</h3>
        <div className="profile-menu">
          <button type="button" className="profile-row" onClick={edit} disabled={!ready}><span className="profile-row-icon"><Pencil size={19} /></span><span className="profile-row-copy">个人资料</span><span className="profile-row-note">昵称与签名</span><ChevronRight size={17} /></button>
          <button type="button" className="profile-row" onClick={() => setPanel('privacy')}><span className="profile-row-icon"><ShieldCheck size={20} /></span><span className="profile-row-copy">数据与隐私</span><span className="profile-row-note">本机保存</span><ChevronRight size={17} /></button>
          <button type="button" className="profile-row" onClick={() => setPanel('about')}><span className="profile-row-icon"><Info size={20} /></span><span className="profile-row-copy">关于班级小站</span><ChevronRight size={17} /></button>
        </div>
      </section>
      <div className="profile-local-note"><Smartphone size={15} /><span>这是你的本机个人空间，暂未接入账号同步。</span></div>
      {error && <p role="alert" className="storage-error">{error}</p>}
      <output className="profile-feedback" aria-live="polite">{notice}</output>

      <Dialog open={panel !== null} onOpenChange={open => { if (!open) setPanel(null); }}>
        <DialogContent className="profile-dialog">
          <DialogTitle>{service?.title ?? (panel === 'edit' ? '编辑个人资料' : panel === 'privacy' ? '数据与隐私' : '关于班级小站')}</DialogTitle>
          <DialogDescription>{service ? '功能草稿 · 学校服务尚未接入' : panel === 'edit' ? '只用于这台设备上的个人主页。' : panel === 'privacy' ? '你的个人内容保存在当前浏览器。' : '为26级生物科学类2班整理日常安排。'}</DialogDescription>
          {service && <div className="profile-dialog-copy"><p>这个入口准备放：</p><ul className="profile-service-list">{service.items.map(item => <li key={item}>{item}</li>)}</ul><p>{service.note}</p><a href="#resources" onClick={() => setPanel(null)}>先添加常用网站 <ArrowUpRight size={16} /></a></div>}
          {panel === 'edit' && <form className="entry-form" onSubmit={event => {
            event.preventDefault();
            const next = { name: draft.name.trim(), bio: draft.bio.trim() };
            if (!next.name) return;
            try {
              localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
              setProfile(next); setError(''); setNotice('个人资料已保存在本机'); setPanel(null);
            } catch { setError('保存失败，请检查浏览器存储设置后重试。'); }
          }}>
            <label htmlFor="profile-name">昵称</label><input id="profile-name" autoComplete="off" maxLength={20} required value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} placeholder="你希望怎么称呼自己" />
            <label htmlFor="profile-bio">一句话签名（选填）</label><input id="profile-bio" maxLength={60} value={draft.bio} onChange={event => setDraft({ ...draft, bio: event.target.value })} placeholder="记录一点当下的心情" />
            {error && <p role="alert" className="storage-error">{error}</p>}
            <button type="submit" className="primary-button" disabled={!draft.name.trim()}><CheckCheck size={16} />保存资料</button>
          </form>}
          {panel === 'privacy' && <div className="profile-dialog-copy"><p>昵称、签名、个人待办与收藏网站保存在本机，不会向全班发布，也不会自动同步到其他设备。</p><p>清除浏览器的网站数据可能会丢失这些内容。班级待办目前只有界面预留，尚未接入共享任务。</p></div>}
          {panel === 'about' && <div className="profile-dialog-copy"><p>这里可以查看课表、记录个人待办、保存常用网站。课程调整请以学校最新通知为准。</p><a href="#schedule" onClick={() => setPanel(null)}>回到课表 <ArrowUpRight size={16} /></a></div>}
        </DialogContent>
      </Dialog>
    </section>
  );
}
