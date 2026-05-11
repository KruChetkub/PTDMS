import { useAuthStore } from '../../stores/auth.store';
import { IndividualProfileView } from './components/IndividualProfileView';

export function ProfilePage() {
  const profile = useAuthStore((state) => state.profile);

  if (!profile) {
    return <div className="py-20 text-center text-slate-500">ไม่พบข้อมูลโปรไฟล์</div>;
  }

  return <IndividualProfileView userId={profile.user_id} isMyProfile />;
}

