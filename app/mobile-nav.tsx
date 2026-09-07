'use client';

import { CalendarDays, ListTodo, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';

const items = [
  { href: '#schedule', label: '课表', icon: CalendarDays },
  { href: '#tasks', label: '待办', icon: ListTodo },
  { href: '#me', label: '我的', icon: UserRound },
];

export default function MobileNav() {
  const [active, setActive] = useState('#schedule');

  useEffect(() => {
    const syncHash = () => setActive(window.location.hash === '#resources' ? '#tasks' : items.some((item) => item.href === window.location.hash) ? window.location.hash : '#schedule');
    syncHash();
    window.addEventListener('hashchange', syncHash);
    return () => window.removeEventListener('hashchange', syncHash);
  }, []);

  return (
    <nav className="mobile-nav" aria-label="手机端快捷导航">
      {items.map(({ href, label, icon: Icon }) => (
        <a key={href} href={href} aria-current={active === href ? 'page' : undefined} className={`mobile-nav-item${active === href ? ' active' : ''}`} onClick={() => setActive(href)}>
          <Icon size={20} strokeWidth={1.8} />
          <span>{label}</span>
        </a>
      ))}
    </nav>
  );
}
