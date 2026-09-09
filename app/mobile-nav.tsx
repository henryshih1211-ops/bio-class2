'use client';

import { CalendarDays, ListTodo, UserRound } from 'lucide-react';

export type MobileView = 'schedule' | 'tasks' | 'me';

const items = [
  { href: '#schedule', label: '课表', icon: CalendarDays },
  { href: '#tasks', label: '待办', icon: ListTodo },
  { href: '#me', label: '我的', icon: UserRound },
];

export default function MobileNav({
  active,
  onChange,
}: {
  active: MobileView;
  onChange: (view: MobileView) => void;
}) {
  return (
    <nav className="mobile-nav" aria-label="手机端快捷导航">
      {items.map(({ href, label, icon: Icon }) => (
        <a
          key={href}
          href={href}
          aria-current={active === href.slice(1) ? 'page' : undefined}
          className={`mobile-nav-item${active === href.slice(1) ? ' active' : ''}`}
          onClick={() => onChange(href.slice(1) as MobileView)}
        >
          <Icon size={20} strokeWidth={1.8} />
          <span>{label}</span>
        </a>
      ))}
    </nav>
  );
}
