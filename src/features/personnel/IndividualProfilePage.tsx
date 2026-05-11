import { useParams, Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { IndividualProfileView } from './components/IndividualProfileView';

export function IndividualProfilePage() {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return (
      <div className="py-20 text-center">
        <p className="text-red-600">ไม่พบรหัสบุคลากร</p>
        <Link to="/personnel" className="mt-4 inline-flex items-center text-brand-600 hover:underline">
          <ChevronLeft className="h-4 w-4" /> กลับไปหน้าขื่อบุคลากร
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link to="/personnel" className="inline-flex items-center text-sm text-slate-500 hover:text-brand-600">
        <ChevronLeft className="mr-1 h-4 w-4" /> กลับไปหน้าขื่อบุคลากร
      </Link>
      <IndividualProfileView userId={id} />
    </div>
  );
}
