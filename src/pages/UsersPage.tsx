import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Pencil, Send, Trash2, UserPlus } from 'lucide-react';
import { toast } from 'react-toastify';
import { userService } from '../services/userService';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchUsers } from '../store/slices/usersSlice';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS } from '../types';
import type { User, UserRole } from '../types';
import {
  Badge,
  Button,
  Checkbox,
  ConfirmDialog,
  DataTable,
  FormField,
  Input,
  Label,
  Modal,
  PageHeader,
} from '@/components/ui';
import type { Column } from '@/components/ui';
import { cn } from '@/lib/utils';

const ROLE_BADGE: Record<UserRole, string> = {
  0: 'bg-purple-500/15 text-purple-700 dark:text-purple-300',
  1: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300',
  2: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  3: 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
  4: 'bg-teal-500/15 text-teal-700 dark:text-teal-300',
  5: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
};

const ROLE_TILE: Record<UserRole, string> = {
  0: 'bg-purple-500/15 text-purple-700 dark:text-purple-300',
  1: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300',
  2: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  3: 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
  4: 'bg-teal-500/15 text-teal-700 dark:text-teal-300',
  5: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
};

const AVATAR_COLORS = [
  'bg-amber-200 text-amber-900 dark:bg-amber-500/25 dark:text-amber-200',
  'bg-sky-200 text-sky-900 dark:bg-sky-500/25 dark:text-sky-200',
  'bg-violet-200 text-violet-900 dark:bg-violet-500/25 dark:text-violet-200',
  'bg-emerald-200 text-emerald-900 dark:bg-emerald-500/25 dark:text-emerald-200',
  'bg-pink-200 text-pink-900 dark:bg-pink-500/25 dark:text-pink-200',
  'bg-orange-200 text-orange-900 dark:bg-orange-500/25 dark:text-orange-200',
  'bg-indigo-200 text-indigo-900 dark:bg-indigo-500/25 dark:text-indigo-200',
];

const UserAvatar = ({ username }: { username: string }) => {
  let hash = 0;
  for (let i = 0; i < username.length; i++) hash = (hash * 31 + username.charCodeAt(i)) | 0;
  return (
    <span
      className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] text-sm font-bold',
        AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length],
      )}
    >
      {username.charAt(0).toUpperCase()}
    </span>
  );
};

const TelegramCell = ({ id }: { id?: string }) =>
  id ? (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      <Send className="h-3.5 w-3.5 text-sky-500" />
      {id}
    </span>
  ) : (
    <span className="text-muted-foreground">Chưa liên kết</span>
  );

interface FormValues {
  username: string;
  name?: string;
  password?: string;
  isActive: boolean;
}

const UsersPage = () => {
  const { user: me, updateUser } = useAuth();
  const dispatch = useAppDispatch();
  const { list: users } = useAppSelector((s) => s.users);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>([2]);
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<FormValues>();

  useEffect(() => {
    dispatch(fetchUsers());
  }, [dispatch]);

  const toggleRole = (r: UserRole) =>
    setSelectedRoles((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));

  const openCreate = () => {
    setEditing(null);
    setSelectedRoles([2]);
    reset({ isActive: true });
    setModalOpen(true);
  };

  const openEdit = (u: User) => {
    setEditing(u);
    setSelectedRoles(u.roles ?? []);
    reset({ username: u.username, name: u.name, isActive: u.isActive });
    setModalOpen(true);
  };

  const onSubmit = async (data: FormValues) => {
    const payload = {
      ...data,
      roles: selectedRoles,
      ...(data.password ? {} : { password: undefined }),
    };
    try {
      if (editing) {
        const updated = await userService.update(editing._id, payload);
        toast.success('Cập nhật người dùng thành công!');
        if (editing._id === me?._id) {
          updateUser({
            roles: updated.roles ?? selectedRoles,
            name: updated.name ?? data.name,
            username: updated.username ?? data.username,
            isActive: updated.isActive ?? data.isActive,
          });
        }
      } else {
        await userService.create(payload);
        toast.success('Thêm người dùng thành công!');
      }
      setModalOpen(false);
      dispatch(fetchUsers());
    } catch {
      toast.error('Có lỗi xảy ra, vui lòng thử lại.');
    }
  };

  const handleDelete = (id: string) => {
    if (id === me?._id) {
      toast.error('Không thể xoá tài khoản đang đăng nhập.');
      return;
    }
    setConfirmId(id);
  };

  const doDelete = async () => {
    if (!confirmId) return;
    try {
      await userService.remove(confirmId);
      toast.success('Đã xoá tài khoản.');
      dispatch(fetchUsers());
    } catch {
      toast.error('Xoá thất bại, vui lòng thử lại.');
    }
    setConfirmId(null);
  };

  const columns: Column<User>[] = [
    {
      key: 'username',
      header: 'Tên đăng nhập',
      render: (u) => (
        <span className="inline-flex items-center gap-3 font-semibold">
          <UserAvatar username={u.username} />
          <span>
            {u.username}
            {u._id === me?._id && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">(bạn)</span>
            )}
          </span>
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Họ tên',
      render: (u) => <span className="text-muted-foreground">{u.name ?? '—'}</span>,
    },
    {
      key: 'telegramId',
      header: 'Telegram',
      render: (u) => <TelegramCell id={u.telegramId} />,
    },
    {
      key: 'roles',
      header: 'Role',
      render: (u) => (
        <div className="flex flex-wrap gap-1">
          {(u.roles ?? []).map((r) => (
            <Badge key={r} variant="outline" className={cn('border-transparent', ROLE_BADGE[r])}>
              {ROLE_LABELS[r]}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (u) =>
        u.isActive ? (
          <Badge variant="success" dot>
            Hoạt động
          </Badge>
        ) : (
          <Badge variant="danger" dot>
            Đã khoá
          </Badge>
        ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      className: 'whitespace-nowrap',
      render: (u) => (
        <span className="inline-flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-[30px] w-[30px]"
            title="Sửa"
            aria-label="Sửa"
            onClick={() => openEdit(u)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          {u._id !== me?._id && (
            <Button
              variant="ghost"
              size="icon"
              className="h-[30px] w-[30px] text-rose-600 hover:text-rose-700 dark:text-rose-400"
              title="Xoá"
              aria-label="Xoá"
              onClick={() => handleDelete(u._id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        kicker="Users"
        title="Quản lý người dùng"
        description="Quản lý tài khoản và phân quyền người dùng trong hệ thống."
        action={
          <Button variant="gradient" onClick={openCreate}>
            <UserPlus />
            Thêm người dùng
          </Button>
        }
      />

      {/* Role summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
        {(Object.entries(ROLE_LABELS) as [string, string][]).map(([val, label]) => {
          const r = Number(val) as UserRole;
          const count = users.filter((u) => (u.roles ?? []).includes(r)).length;
          return (
            <div key={r} className="flex items-center gap-3 rounded-[14px] border bg-card p-4">
              <span
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] font-display text-base font-bold',
                  ROLE_TILE[r],
                )}
              >
                {count}
              </span>
              <span className="text-sm text-muted-foreground leading-tight">{label}</span>
            </div>
          );
        })}
      </div>

      <div className="hidden md:block">
        <DataTable<User>
          data={users}
          keyExtractor={(u) => u._id}
          columns={columns}
          footer={
            <tr className="border-t">
              <td colSpan={6} className="px-5 py-3 text-xs text-muted-foreground">
                {users.length} tài khoản · {users.filter((u) => u.isActive).length} đang hoạt động
              </td>
            </tr>
          }
        />
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {users.map((u) => (
          <div key={u._id} className="rounded-[14px] border bg-card p-4">
            <div className="flex items-start justify-between mb-1 gap-2">
              <div className="flex min-w-0 items-center gap-3">
                <UserAvatar username={u.username} />
                <div className="min-w-0">
                  <div className="font-semibold truncate">
                    {u.username}
                    {u._id === me?._id && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">(bạn)</span>
                    )}
                  </div>
                  {u.name && <div className="text-sm text-muted-foreground">{u.name}</div>}
                </div>
              </div>
              {u.isActive ? (
                <Badge variant="success" dot className="shrink-0">
                  Hoạt động
                </Badge>
              ) : (
                <Badge variant="danger" dot className="shrink-0">
                  Đã khoá
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {(u.roles ?? []).map((r) => (
                <Badge
                  key={r}
                  variant="outline"
                  className={cn('border-transparent', ROLE_BADGE[r])}
                >
                  {ROLE_LABELS[r]}
                </Badge>
              ))}
            </div>
            <div className="flex items-center gap-1 mt-3 pt-3 border-t">
              <span className="mr-auto text-xs">
                <TelegramCell id={u.telegramId} />
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-[30px] w-[30px]"
                title="Sửa"
                aria-label="Sửa"
                onClick={() => openEdit(u)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              {u._id !== me?._id && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-[30px] w-[30px] text-rose-600 hover:text-rose-700 dark:text-rose-400"
                  title="Xoá"
                  aria-label="Xoá"
                  onClick={() => handleDelete(u._id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editing ? 'Sửa người dùng' : 'Thêm người dùng'}
        size="sm"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <FormField label="Tên đăng nhập" required htmlFor="username">
            <Input id="username" autoComplete="off" {...register('username', { required: true })} />
          </FormField>
          <FormField label="Họ tên" htmlFor="name">
            <Input id="name" {...register('name')} />
          </FormField>
          <FormField
            label={editing ? 'Mật khẩu mới (để trống = không đổi)' : 'Mật khẩu'}
            required={!editing}
            htmlFor="password"
          >
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              {...register('password', { required: !editing })}
            />
          </FormField>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <div className="rounded-[10px] border p-1.5 space-y-0.5">
              {(Object.entries(ROLE_LABELS) as [string, string][]).map(([val, label]) => {
                const r = Number(val) as UserRole;
                return (
                  <label
                    key={r}
                    className="flex items-center gap-2 cursor-pointer hover:bg-muted px-2 py-1.5 rounded-lg"
                  >
                    <Checkbox
                      checked={selectedRoles.includes(r)}
                      onCheckedChange={() => toggleRole(r)}
                    />
                    <Badge variant="outline" className={cn('border-transparent', ROLE_BADGE[r])}>
                      {label}
                    </Badge>
                  </label>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              {...register('isActive')}
              type="checkbox"
              id="isActive"
              className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-ring"
            />
            <Label htmlFor="isActive">Đang hoạt động</Label>
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
        message="Bạn có chắc muốn xoá tài khoản này?"
        onConfirm={doDelete}
      />
    </div>
  );
};

export default UsersPage;
