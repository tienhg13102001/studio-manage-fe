import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Pencil, Plus, Search } from 'lucide-react';
import { toast } from 'react-toastify';
import {
  Badge,
  Button,
  FormField,
  Input,
  Label,
  Modal,
  PageHeader,
  Textarea,
} from '@/components/ui';
import { externalPhotographerService } from '../services/externalPhotographerService';
import type { ExternalPhotographer } from '../types';

interface FormValues {
  name: string;
  phone: string;
  defaultFee: string;
  notes: string;
  isActive: boolean;
}

const ExternalPhotographersPage = () => {
  const [people, setPeople] = useState<ExternalPhotographer[]>([]);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<ExternalPhotographer | null>(null);
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting, errors },
  } = useForm<FormValues>();

  const reload = () =>
    externalPhotographerService
      .getAll()
      .then(setPeople)
      .catch(() => toast.error('Không tải được danh sách thợ ngoài.'));

  useEffect(() => {
    reload();
  }, []);

  const showForm = (person: ExternalPhotographer | null) => {
    setEditing(person);
    reset({
      name: person?.name ?? '',
      phone: person?.phone ?? '',
      defaultFee: person?.defaultFee == null ? '' : String(person.defaultFee),
      notes: person?.notes ?? '',
      isActive: person?.isActive ?? true,
    });
    setOpen(true);
  };

  const save = async (values: FormValues) => {
    try {
      const data = {
        name: values.name.trim(),
        phone: values.phone.trim(),
        defaultFee: values.defaultFee === '' ? null : Number(values.defaultFee),
        notes: values.notes.trim(),
        isActive: values.isActive,
      };
      if (editing) await externalPhotographerService.update(editing._id, data);
      else await externalPhotographerService.create(data);
      toast.success(editing ? 'Đã cập nhật thợ ngoài.' : 'Đã thêm thợ ngoài.');
      setOpen(false);
      reload();
    } catch {
      toast.error('Không lưu được thợ ngoài.');
    }
  };

  const filtered = people.filter((person) =>
    `${person.name} ${person.phone ?? ''}`.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div className="flex flex-col md:min-h-0 md:flex-1">
      <PageHeader
        kicker="Crew"
        title="Thợ ngoài"
        description="Quản lý thợ cộng tác để phân công lịch chụp mà không cần tạo tài khoản đăng nhập."
        action={
          <Button variant="gradient" onClick={() => showForm(null)}>
            <Plus /> Thêm thợ ngoài
          </Button>
        }
      />

      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Tìm theo tên hoặc số điện thoại"
          className="pl-9"
        />
      </div>

      <div className="overflow-x-auto rounded-[14px] border bg-card">
        <table className="w-full min-w-[650px] text-sm">
          <thead className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Họ tên</th>
              <th className="px-4 py-3 text-left">Liên hệ</th>
              <th className="px-4 py-3 text-left">Chi phí mặc định/buổi</th>
              <th className="px-4 py-3 text-left">Trạng thái</th>
              <th className="px-4 py-3 text-right">Sửa</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((person) => (
              <tr key={person._id}>
                <td className="px-4 py-3">
                  <div className="font-semibold">{person.name}</div>
                  {person.notes && (
                    <div
                      className="max-w-xs truncate text-xs text-muted-foreground"
                      title={person.notes}
                    >
                      {person.notes}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  {person.phone ? <a href={`tel:${person.phone}`}>{person.phone}</a> : '—'}
                </td>
                <td className="px-4 py-3 tabular">
                  {person.defaultFee == null
                    ? '—'
                    : `${person.defaultFee.toLocaleString('vi-VN')}₫`}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={person.isActive ? 'success' : 'neutral'} dot>
                    {person.isActive ? 'Đang hợp tác' : 'Ngừng hợp tác'}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Sửa"
                    aria-label={`Sửa ${person.name}`}
                    onClick={() => showForm(person)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            {query ? 'Không tìm thấy thợ ngoài.' : 'Chưa có thợ ngoài. Hãy thêm người đầu tiên.'}
          </p>
        )}
      </div>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title={editing ? 'Sửa thợ ngoài' : 'Thêm thợ ngoài'}
        size="sm"
      >
        <form onSubmit={handleSubmit(save)} className="space-y-3">
          <FormField label="Họ tên" required error={errors.name?.message} htmlFor="external-name">
            <Input id="external-name" {...register('name', { required: 'Vui lòng nhập họ tên' })} />
          </FormField>
          <FormField label="Số điện thoại" htmlFor="external-phone">
            <Input id="external-phone" type="tel" {...register('phone')} />
          </FormField>
          <FormField label="Chi phí mặc định mỗi buổi (₫)" htmlFor="external-fee">
            <Input
              id="external-fee"
              type="number"
              min={0}
              step={1000}
              {...register('defaultFee')}
            />
          </FormField>
          <FormField label="Ghi chú" htmlFor="external-notes">
            <Textarea id="external-notes" rows={3} {...register('notes')} />
          </FormField>
          <label className="flex items-center gap-2">
            <input type="checkbox" {...register('isActive')} className="h-4 w-4" />
            <Label>Đang hợp tác</Label>
          </label>
          <p className="text-xs text-muted-foreground">
            Người ngừng hợp tác vẫn hiện trong lịch cũ, nhưng không thể phân công vào lịch mới.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Huỷ
            </Button>
            <Button type="submit" variant="gradient" disabled={isSubmitting}>
              Lưu
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ExternalPhotographersPage;
