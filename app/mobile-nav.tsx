import { CalendarDays, Link2, ListTodo } from 'lucide-react';

const items = [
  { href: '#schedule', label: '课表', icon: CalendarDays },
  { href: '#tasks', label: '待办', icon: ListTodo },
  { href: '#resources', label: '内务', icon: Link2 },
];

export default function MobileNav() {
  return (
    <nav className="mobile-nav" aria-label="手机端快捷导航">
      {items.map(({ href, label, icon: Icon }) => (
        <a key={href} href={href} className="mobile-nav-item">
          <Icon size={20} strokeWidth={1.8} />
          <span>{label}</span>
        </a>
      ))}
    </nav>
  );
}
