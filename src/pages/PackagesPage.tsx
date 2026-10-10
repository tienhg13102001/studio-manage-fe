import { useEffect, useState } from 'react';
import { Clock, Pencil, Plus, Timer, Trash2, Users, Video, Wand2 } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'react-toastify';
import { packageService } from '../services/packageService';
import { costumeTypeService } from '../services/costumeTypeService';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchPackages } from '../store/slices/packagesSlice';
import type { CostumeType, Package } from '../types';
import {
  Badge,
  Button,
  Checkbox,
  ConfirmDialog,
  FormField,
  Input,
  Label,
  Modal,
  MultiSelect,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  TableSkeleton,
  Textarea,
} from '@/components/ui';
import { cn } from '@/lib/utils';

const editingScopeLabel: Record<string, string> = {
  full: 'Toàn bộ',
  partial: 'Một phần',
};

const durationLabel: Record<string, string> = {
  full_day: '1 ngày',
  half_day: '1/2 ngày',
  two_thirds_day: '2/3 ngày',
};

const NO_DURATION = '__none__';

interface PackageFormValues {
  name: string;
  pricePerMember: number;
  duration?: 'full_day' | 'half_day' | 'two_thirds_day';
  costumes?: string[];
  crewRatio?: string;
  editingScope?: 'full' | 'partial';
  deliveryDays?: number;
  studentsPerCrew?: number;
  description?: string;
  isPopular?: boolean;
  hasMv?: boolean;
}

const PackagesPage = () => {
  const dispatch = useAppDispatch();
  const { list: packages, loading } = useAppSelector((s) => s.packages);
  const [allCostumes, setAllCostumes] = useState<CostumeType[]>([]);
  const [selectedCostumes, setSelectedCostumes] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Package | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { isSubmitting },
  } = useForm<PackageFormValues>();

  useEffect(() => {
    dispatch(fetchPackages());
    costumeTypeService.getAll().then(setAllCostumes);
  }, [dispatch]);

  const openCreate = () => {
    setEditing(null);
    setSelectedCostumes([]);
    reset({ editingScope: 'full', isPopular: false, hasMv: false });
    setModalOpen(true);
  };

  const openEdit = (pkg: Package) => {
    setEditing(pkg);
    const costumeIds = (pkg.costumes ?? []).map((c) => c._id);
    setSelectedCostumes(costumeIds);
    reset({
      name: pkg.name,
      pricePerMember: pkg.pricePerMember,
      duration: pkg.duration,
      costumes: costumeIds,
      crewRatio: pkg.crewRatio,
      editingScope: pkg.editingScope ?? 'full',
      deliveryDays: pkg.deliveryDays,
      studentsPerCrew: pkg.studentsPerCrew,
      description: pkg.description,
      isPopular: pkg.isPopular ?? false,
      hasMv: pkg.hasMv ?? false,
    });
    setModalOpen(true);
  };

  const onSubmit = async (data: PackageFormValues) => {
    try {
      const payload = { ...data, costumes: selectedCostumes };
      if (editing) {
        await packageService.update(editing._id, payload);
        toast.success('Cập nhật gói chụp thành công!');
      } else {
        await packageService.create(payload);
        toast.success('Thêm gói chụp thành công!');
      }
      setModalOpen(false);
      dispatch(fetchPackages());
    } catch {
      toast.error('Có lỗi xảy ra, vui lòng thử lại.');
    }
  };

  const doDelete = async () => {
    if (!confirmId) return;
    try {
      await packageService.remove(confirmId);
      toast.success('Đã xoá gói chụp.');
      dispatch(fetchPackages());
    } catch {
      toast.error('Xoá thất bại, vui lòng thử lại.');
    }
    setConfirmId(null);
  };

  return (
    <div>
      <PageHeader
        kicker="Settings"
        title="Gói chụp"
        description="Cấu hình các gói chụp ảnh và thời lượng."
        action={
          <Button variant="gradient" onClick={openCreate}>
            <Plus />
            Thêm gói
          </Button>
        }
      />

      {loading ? (
        <TableSkeleton cols={8} />
      ) : packages.length === 0 ? (
        <div className="rounded-[14px] border bg-card py-10 text-center text-muted-foreground">
          Chưa có gói chụp nào
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {packages.map((pkg) => {
            const attrs = [
              {
                icon: Clock,
                label: 'Thời gian',
                value: pkg.duration ? durationLabel[pkg.duration] : null,
              },
              {
                icon: Users,
                label: 'Ekip',
                value: pkg.studentsPerCrew != null ? `${pkg.studentsPerCrew} hs/thợ` : null,
              },
              {
                icon: Video,
                label: 'Quay MV kỷ yếu',
                value: pkg.hasMv ? '1 thợ quay' : null,
                highlight: true,
              },
              {
                icon: Wand2,
                label: 'Chỉnh sửa',
                value: pkg.editingScope ? editingScopeLabel[pkg.editingScope] : null,
              },
              {
                icon: Timer,
                label: 'Trả file tối đa',
                value: pkg.deliveryDays != null ? `${pkg.deliveryDays} ngày` : null,
              },
            ].filter((a) => a.value);
            return (
              <div
                key={pkg._id}
                className={cn(
                  'flex flex-col rounded-[14px] border bg-card p-5',
                  pkg.isPopular && 'border-primary shadow-[0_6px_20px_rgba(245,158,11,0.15)]',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <h3 className="font-display text-[16px] font-bold">{pkg.name}</h3>
                    {pkg.isPopular && (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                        Phổ biến
                      </span>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-[30px] w-[30px] text-muted-foreground hover:text-foreground"
                      onClick={() => openEdit(pkg)}
                      title="Sửa"
                      aria-label="Sửa"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-[30px] w-[30px] text-rose-600 hover:bg-rose-500/10 dark:text-rose-400"
                      onClick={() => setConfirmId(pkg._id)}
                      title="Xoá"
                      aria-label="Xoá"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="mt-5 flex items-baseline gap-2">
                  <span className="font-display text-[32px] font-bold leading-none tracking-tight tabular">
                    {pkg.pricePerMember.toLocaleString('vi-VN')}₫
                  </span>
                  <span className="text-sm text-muted-foreground">/ thành viên</span>
                </div>

                {pkg.description && (
                  <p className="mt-4 text-sm text-muted-foreground">{pkg.description}</p>
                )}

                {attrs.length > 0 && (
                  <div className="mt-4 space-y-2.5 border-t pt-4">
                    {attrs.map(({ icon: Icon, label, value, highlight }) => (
                      <div key={label} className="flex items-center justify-between gap-3 text-sm">
                        <span className="inline-flex items-center gap-2.5 text-muted-foreground">
                          <Icon className={cn('h-4 w-4', highlight && 'text-primary')} />
                          {label}
                        </span>
                        <span className={cn('font-semibold', highlight && 'text-primary')}>
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {pkg.costumes && pkg.costumes.length > 0 && (
                  <div className="mt-4">
                    <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                      Trang phục
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {pkg.costumes.map((c) => (
                        <Badge
                          key={c._id}
                          variant="neutral"
                          className="rounded-md px-2.5 font-medium"
                        >
                          {c.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editing ? 'Sửa gói chụp' : 'Thêm gói chụp'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Tên gói" required htmlFor="pkgName" className="sm:col-span-2">
              <Input
                id="pkgName"
                placeholder="VD: Gói cơ bản, Gói nâng cao..."
                {...register('name', { required: true })}
              />
            </FormField>
            <FormField label="Giá/thành viên (₫)" required htmlFor="price">
              <Input
                id="price"
                type="number"
                min={0}
                placeholder="VD: 150000"
                {...register('pricePerMember', { required: true, valueAsNumber: true })}
              />
            </FormField>
            <FormField label="Thời gian">
              <Controller
                name="duration"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value || NO_DURATION}
                    onValueChange={(v) => field.onChange(v === NO_DURATION ? undefined : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="-- Không xác định --" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_DURATION}>-- Không xác định --</SelectItem>
                      <SelectItem value="half_day">1/2 ngày</SelectItem>
                      <SelectItem value="two_thirds_day">2/3 ngày</SelectItem>
                      <SelectItem value="full_day">1 ngày</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <FormField label="Ekip (số học sinh / 1 thợ)" htmlFor="studentsPerCrew">
              <Input
                id="studentsPerCrew"
                type="number"
                min={1}
                placeholder="Ví dụ: 20"
                {...register('studentsPerCrew', { valueAsNumber: true })}
              />
            </FormField>
            <FormField label="Trang phục">
              <MultiSelect
                options={allCostumes.map((c) => ({
                  value: c._id,
                  label: c.name + (c.description ? ` — ${c.description}` : ''),
                }))}
                value={selectedCostumes}
                onChange={setSelectedCostumes}
                placeholder={
                  allCostumes.length === 0
                    ? 'Chưa có loại trang phục nào'
                    : 'Chọn loại trang phục...'
                }
                disabled={allCostumes.length === 0}
              />
            </FormField>
            <FormField label="Chỉnh sửa ảnh">
              <Controller
                name="editingScope"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? 'full'} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">Toàn bộ file</SelectItem>
                      <SelectItem value="partial">Một phần</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <FormField label="Trả file sau tối đa (ngày)" htmlFor="deliveryDays">
              <Input
                id="deliveryDays"
                type="number"
                min={1}
                placeholder="VD: 7"
                {...register('deliveryDays', { valueAsNumber: true })}
              />
            </FormField>
            <FormField label="Mô tả thêm" htmlFor="pkgDesc" className="sm:col-span-2">
              <Textarea
                id="pkgDesc"
                rows={2}
                placeholder="Thông tin bổ sung..."
                {...register('description')}
              />
            </FormField>
            <div className="sm:col-span-2">
              <Controller
                name="isPopular"
                control={control}
                render={({ field }) => (
                  <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                    <Checkbox
                      checked={!!field.value}
                      onCheckedChange={(v) => field.onChange(!!v)}
                    />
                    <Label className="cursor-pointer">
                      Đánh dấu là gói <strong>phổ biến</strong> (hiển thị nổi bật trên trang giới
                      thiệu)
                    </Label>
                  </label>
                )}
              />
            </div>
            <div className="sm:col-span-2">
              <Controller
                name="hasMv"
                control={control}
                render={({ field }) => (
                  <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                    <Checkbox
                      checked={!!field.value}
                      onCheckedChange={(v) => field.onChange(!!v)}
                    />
                    <Label className="cursor-pointer">
                      Có <strong>quay MV kỷ yếu</strong> (1 thợ quay/lớp)
                    </Label>
                  </label>
                )}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Huỷ
            </Button>
            <Button type="submit" variant="gradient" disabled={isSubmitting}>
              Lưu
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmId}
        onOpenChange={(o) => !o && setConfirmId(null)}
        title="Xác nhận xoá"
        message="Bạn có chắc muốn xoá gói chụp này?"
        onConfirm={doDelete}
      />
    </div>
  );
};

export default PackagesPage;
