import { zodResolver } from '@hookform/resolvers/zod';
import { Save, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { trainingFormSchema, type TrainingFormValues } from '../../features/self-service/training-form.schema';
import { formatThaiLongDate, getCurrentThaiFiscalYear, getThaiFiscalYearFromISODate } from '../../utils/thaiDate';

export type TrainingFormProps = {
  initialValues?: Partial<TrainingFormValues>;
  onSubmit: (values: TrainingFormValues) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  submitLabel?: string;
};

const defaultValues: TrainingFormValues = {
  course: '',
  category: '',
  subcategory: '',
  organizer: '',
  date: '',
  year: getCurrentThaiFiscalYear(),
  certificateName: '',
  certificateLink: '',
  developmentArea: '',
  skillGroup: '',
  targetDirection: '',
};

export function TrainingForm({ 
  initialValues, 
  onSubmit, 
  onCancel, 
  isLoading, 
  submitLabel = 'บันทึกข้อมูลอบรม' 
}: TrainingFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TrainingFormValues>({
    resolver: zodResolver(trainingFormSchema),
    defaultValues: { ...defaultValues, ...initialValues },
  });

  const isPending = isLoading || isSubmitting;
  const selectedDate = watch('date');
  const dateField = register('date');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <label className="block lg:col-span-2">
          <span className="text-sm font-medium text-slate-700">ชื่อหลักสูตร</span>
          <input
            type="text"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            {...register('course')}
            disabled={isPending}
          />
          {errors.course ? <span className="mt-1 block text-xs text-red-600">{errors.course.message}</span> : null}
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">ประเภทการอบรม</span>
          <input
            type="text"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            {...register('category')}
            disabled={isPending}
          />
          {errors.category ? <span className="mt-1 block text-xs text-red-600">{errors.category.message}</span> : null}
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">หมวดย่อย</span>
          <input
            type="text"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            {...register('subcategory')}
            disabled={isPending}
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">หน่วยงานผู้จัด</span>
          <input
            type="text"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            {...register('organizer')}
            disabled={isPending}
          />
          {errors.organizer ? <span className="mt-1 block text-xs text-red-600">{errors.organizer.message}</span> : null}
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">วันที่อบรม</span>
            <input
              type="date"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              {...dateField}
              onChange={(event) => {
                void dateField.onChange(event);
                const fiscalYear = getThaiFiscalYearFromISODate(event.target.value);

                if (fiscalYear) {
                  setValue('year', fiscalYear, { shouldDirty: true, shouldValidate: true });
                }
              }}
              disabled={isPending}
            />
            {errors.date ? <span className="mt-1 block text-xs text-red-600">{errors.date.message}</span> : null}
            {selectedDate ? (
              <span className="mt-1 block text-xs text-slate-500">วันที่แบบไทย: {formatThaiLongDate(selectedDate)}</span>
            ) : null}
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">ปีงบประมาณ</span>
            <input
              type="number"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              {...register('year')}
              disabled={isPending}
            />
            {errors.year ? <span className="mt-1 block text-xs text-red-600">{errors.year.message}</span> : null}
          </label>
        </div>
      </div>

      <div className="border-t border-slate-200 pt-5">
        <h2 className="text-base font-semibold text-slate-900">ใบประกาศ</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">ชื่อใบประกาศ</span>
            <input
              type="text"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              {...register('certificateName')}
              disabled={isPending}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">ลิงก์ใบประกาศ</span>
            <input
              type="text"
              placeholder="https://..."
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              {...register('certificateLink')}
              disabled={isPending}
            />
            {errors.certificateLink ? (
              <span className="mt-1 block text-xs text-red-600">{errors.certificateLink.message}</span>
            ) : null}
          </label>
        </div>
      </div>

      <div className="border-t border-slate-200 pt-5">
        <h2 className="text-base font-semibold text-slate-900">ข้อมูลวิเคราะห์การพัฒนา</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">ด้านการพัฒนา</span>
            <input
              type="text"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              {...register('developmentArea')}
              disabled={isPending}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">กลุ่มทักษะ</span>
            <input
              type="text"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              {...register('skillGroup')}
              disabled={isPending}
            />
          </label>

          <label className="block lg:col-span-2">
            <span className="text-sm font-medium text-slate-700">แนวทางการพัฒนา</span>
            <textarea
              rows={4}
              className="mt-1 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              {...register('targetDirection')}
              disabled={isPending}
            />
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-end">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
            ยกเลิก
          </button>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <Save className="h-4 w-4" aria-hidden="true" />
          {isPending ? 'กำลังบันทึก...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
