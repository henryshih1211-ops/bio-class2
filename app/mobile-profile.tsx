import { UserRound } from 'lucide-react';

export default function MobileProfile() {
  return (
    <section id="me" className="mobile-profile" aria-label="我的">
      <span className="mobile-profile-mark"><UserRound size={21} strokeWidth={1.8} /></span>
      <div>
        <p className="eyebrow">我的</p>
        <h2>个人空间</h2>
        <p>个人资料、消息和更多设置会逐步放在这里。</p>
      </div>
    </section>
  );
}
