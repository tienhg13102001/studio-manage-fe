import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Lock, LockOpen, Pencil, Search, Send, Trash2, UserPlus, X } from 'lucide-react';
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
  FilterChip,
  FormField,
  Input,
  Label,
  Modal,
  PageHeader,
  RowActions,
} from '@/components/ui';
import type { Column } from '@/components/ui';
import { cn } from '@/lib/utils';

const ROLE_ENTRIES = Object.entries(ROLE_LABELS).map(
  ([v, label]) => [Number(v) as UserRole, label] as const,
);

/** Vai trò là nhãn phân loại, không phải trạng thái: viền mảnh, không tô màu. */
const RoleTags = ({ roles }: { roles: UserRole[] }) => (
  <div className="flex flex-wrap gap-1">
    {roles.map((r) => (
      <span
        key={r}
        className="inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium text-foreground"
      >
        {ROLE_LABELS[r]}
      </span>
    ))}
  </div>
);

const UserAvatar = ({ name }: { name: string }) => (
  <span
    aria-hidden
    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold text-foreground"
  >
    {name.charAt(0).toUpperCase()}
  </span>
);

const StatusBadge = ({ active }: { active: boolean }) =>
  active ? (
    <Badge variant="success" dot>
      Hoạt động
    </Badge>
  ) : (
    <Badge variant="neutral" dot>
      Đã khoá
    </Badge>
  );

const TelegramCell = ({ id }: { id?: string }) =>
  id ? (
    <span className="tabular inline-flex items-center gap-1.5 text-foreground">
      <Send className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
      {id}
    </span>
  ) : (
    <span className="whitespace-nowrap text-muted-foreground">Chưa liên kết</span>
  );

const Identity = ({ u, isMe }: { u: User; isMe: boolean }) => (
  <span className="min-w-0">
    <span
      className={cn(
        'block truncate font-semibold',
        u.isActive ? 'text-foreground' : 'text-muted-foreground',
      )}
    >
      {u.name || u.username}
      {isMe && <span className="ml-2 text-xs font-normal text-muted-foreground">(bạn)</span>}
    </span>
    {u.name && (
      <span className="block truncate text-[13px] text-muted-foreground">@{u.username}</span>
    )}
  </span>
);

interface FormValues {
  username: string;
  name?: string;
  password?: string;
  isActive: boolean;
}

/** Bỏ dấu tiếng Việt để tìm "nguyen" ra "Nguyễn". */
const fold = (t: string) =>
  t
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/đ/g, 'd');

const apiMessage = (err: unknown) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message;

const UsersPage = () => {
  const { user: me, updateUser } = useAuth();
  const dispatch = useAppDispatch();
  const { list: users, loading, error } = useAppSelector((s) => s.users);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>([2]);
  const [roleError, setRoleError] = useState(false);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting, errors },
  } = useForm<FormValues>();

  useEffect(() => {
    dispatch(fetchUsers());
  }, [dispatch]);

  const toggleRole = (r: UserRole) => {
    setRoleError(false);
    setSelectedRoles((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  };

  const openCreate = () => {
    setEditing(null);
    setSelectedRoles([2]);
    setRoleError(false);
    reset({ username: '', name: '', password: '', isActive: true });
    setModalOpen(true);
  };

  const openEdit = (u: User) => {
    setEditing(u);
    setSelectedRoles(u.roles ?? []);
    setRoleError(false);
    reset({ username: u.username, name: u.name, password: '', isActive: u.isActive });
    setModalOpen(true);
  };

  const onSubmit = async (data: FormValues) => {
    if (selectedRoles.length === 0) {
      setRoleError(true);
      return;
    }
    const payload = {
      ...data,
      // Không cho tự khoá mình (checkbox đã khoá, chặn thêm ở đây cho chắc).
      ...(editing && editing._id === me?._id ? { isActive: true } : {}),
      roles: selectedRoles,
      ...(data.password ? {} : { password: undefined }),
    };
    try {
      if (editing) {
        const updated = await userService.update(editing._id, payload);
        toast.success('Đã cập nhật người dùng.');
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
        toast.success('Đã thêm người dùng.');
      }
      setModalOpen(false);
      dispatch(fetchUsers());
    } catch (err) {
      toast.error(apiMessage(err) || 'Không lưu được người dùng. Kiểm tra kết nối rồi thử lại.');
    }
  };

  const toggleActive = async (u: User) => {
    try {
      await userService.update(u._id, { isActive: !u.isActive });
      toast.success(u.isActive ? `Đã khoá tài khoản ${u.username}.` : `Đã mở khoá ${u.username}.`);
      dispatch(fetchUsers());
    } catch (err) {
      toast.error(apiMessage(err) || 'Không đổi được trạng thái tài khoản.');
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
    } catch (err) {
      toast.error(apiMessage(err) || 'Xoá thất bại, vui lòng thử lại.');
    }
    setConfirmId(null);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter(
      (u) =>
        (roleFilter === null || (u.roles ?? []).includes(roleFilter)) &&
        (!q || fold(`${u.username} ${u.name ?? ''}`).includes(fold(q))),
    );
  }, [users, query, roleFilter]);

  const activeCount = users.filter((u) => u.isActive).length;
  const editingSelf = !!editing && editing._id === me?._id;
  const filtering = !!query.trim() || roleFilter !== null;
  const firstLoad = loading && users.length === 0;
  const loadFailed = !!error && users.length === 0;

  const actionsFor = (u: User) => {
    const isMe = u._id === me?._id;
    return (
      <RowActions
        subject={`tài khoản ${u.username}`}
        primary={{
          label: 'Sửa',
          icon: <Pencil className="h-4 w-4" />,
          onSelect: () => openEdit(u),
        }}
        actions={[
          {
            label: u.isActive ? 'Khoá tài khoản' : 'Mở khoá',
            icon: u.isActive ? <Lock className="h-4 w-4" /> : <LockOpen className="h-4 w-4" />,
            onSelect: () => toggleActive(u),
            hidden: isMe,
          },
          {
            label: 'Xoá tài khoản',
            icon: <Trash2 className="h-4 w-4" />,
            onSelect: () => handleDelete(u._id),
            destructive: true,
            hidden: isMe,
          },
        ]}
      />
    );
  };

  const columns: Column<User>[] = [
    {
      key: 'account',
      header: 'Tài khoản',
      render: (u) => (
        <span className="inline-flex items-center gap-3">
          <UserAvatar name={u.name || u.username} />
          <Identity u={u} isMe={u._id === me?._id} />
        </span>
      ),
    },
    { key: 'roles', header: 'Vai trò', render: (u) => <RoleTags roles={u.roles ?? []} /> },
    { key: 'telegram', header: 'Telegram', render: (u) => <TelegramCell id={u.telegramId} /> },
    { key: 'status', header: 'Trạng thái', render: (u) => <StatusBadge active={u.isActive} /> },
    {
      key: 'actions',
      header: <span className="sr-only">Thao tác</span>,
      align: 'right',
      className: 'w-24',
      render: actionsFor,
    },
  ];

  return (
    <div className="flex flex-col md:min-h-0 md:flex-1">
      <PageHeader
        title="Người dùng"
        description={
          firstLoad
            ? 'Đang tải tài khoản…'
            : loadFailed
              ? 'Tài khoản và vai trò trong studio.'
              : `${users.length} tài khoản · ${activeCount} đang hoạt động`
        }
        action={
          <Button onClick={openCreate} className="max-md:w-full">
            <UserPlus />
            Thêm người dùng
          </Button>
        }
      />

      <div className="mb-4 space-y-3">
        <div className="relative sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm theo tên hoặc tên đăng nhập"
            aria-label="Tìm người dùng"
            className="pl-9 pr-9"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Xoá tìm kiếm"
              className="absolute right-1.5 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {!firstLoad && !loadFailed && (
          <div
            role="group"
            aria-label="Lọc theo vai trò"
            className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0"
          >
            <FilterChip active={roleFilter === null} onClick={() => setRoleFilter(null)}>
              Tất cả <span className="tabular">{users.length}</span>
            </FilterChip>
            {ROLE_ENTRIES.map(([r, label]) => (
              <FilterChip
                key={r}
                active={roleFilter === r}
                onClick={() => setRoleFilter(roleFilter === r ? null : r)}
              >
                <span className="whitespace-nowrap">{label}</span>
                <span className="tabular">
                  {users.filter((u) => (u.roles ?? []).includes(r)).length}
                </span>
              </FilterChip>
            ))}
          </div>
        )}
      </div>

      <DataTable<User>
        fill
        className="md:flex-1"
        loading={firstLoad}
        error={loadFailed ? 'Kiểm tra kết nối mạng rồi thử lại.' : undefined}
        onRetry={() => dispatch(fetchUsers())}
        data={filtered}
        keyExtractor={(u) => u._id}
        columns={columns}
        emptyTitle={filtering ? 'Không có tài khoản nào khớp' : 'Chưa có tài khoản'}
        emptyAction={
          filtering ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setQuery('');
                setRoleFilter(null);
              }}
            >
              Xoá bộ lọc
            </Button>
          ) : undefined
        }
        mobileCard={(u) => (
          <div className="flex items-start gap-3">
            <UserAvatar name={u.name || u.username} />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex items-start gap-2">
                <Identity u={u} isMe={u._id === me?._id} />
                {!u.isActive && <StatusBadge active={false} />}
              </div>
              <RoleTags roles={u.roles ?? []} />
              <div className="text-[13px]">
                <TelegramCell id={u.telegramId} />
              </div>
            </div>
            <div className="-mr-2 -mt-1">{actionsFor(u)}</div>
          </div>
        )}
      />

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editing ? `Sửa ${editing.name || editing.username}` : 'Thêm người dùng'}
        size="sm"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <FormField
            label="Tên đăng nhập"
            required
            htmlFor="username"
            error={errors.username?.message}
          >
            <Input
              id="username"
              autoComplete="off"
              autoCapitalize="none"
              aria-invalid={!!errors.username}
              {...register('username', {
                setValueAs: (v) => (v ?? '').trim(),
                validate: (v) => v !== '' || 'Vui lòng nhập tên đăng nhập',
              })}
            />
          </FormField>
          <FormField label="Họ tên" htmlFor="name">
            <Input id="name" {...register('name')} />
          </FormField>
          <FormField
            label={editing ? 'Mật khẩu mới (để trống nếu không đổi)' : 'Mật khẩu'}
            required={!editing}
            htmlFor="password"
            error={errors.password?.message}
          >
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!errors.password}
              {...register('password', {
                validate: (v) => !!editing || !!v || 'Vui lòng nhập mật khẩu',
              })}
            />
          </FormField>
          <div className="space-y-1.5">
            <Label id="roles-label">
              Vai trò <span className="text-destructive">*</span>
            </Label>
            <div
              role="group"
              aria-labelledby="roles-label"
              className={cn(
                'grid grid-cols-2 gap-0.5 rounded-md border p-1.5',
                roleError && 'border-destructive',
              )}
            >
              {ROLE_ENTRIES.map(([r, label]) => (
                <label
                  key={r}
                  className="flex min-h-9 cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                >
                  <Checkbox
                    checked={selectedRoles.includes(r)}
                    onCheckedChange={() => toggleRole(r)}
                  />
                  {label}
                </label>
              ))}
            </div>
            {roleError && (
              <p role="alert" className="text-[13px] text-destructive">
                Chọn ít nhất một vai trò
              </p>
            )}
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-md border p-3">
            <input
              {...register('isActive')}
              type="checkbox"
              disabled={editingSelf}
              className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]"
            />
            <span>
              <span className="block text-sm font-medium text-foreground">Đang hoạt động</span>
              <span className="block text-[13px] text-muted-foreground">
                {editingSelf
                  ? 'Không thể tự khoá tài khoản đang đăng nhập.'
                  : 'Bỏ chọn để khoá: người này không đăng nhập được nữa.'}
              </span>
            </span>
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Huỷ
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {editing ? 'Lưu thay đổi' : 'Thêm người dùng'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmId}
        onOpenChange={(o) => !o && setConfirmId(null)}
        title="Xoá tài khoản này?"
        message="Người này sẽ không đăng nhập được nữa. Nếu chỉ tạm nghỉ, hãy dùng Khoá tài khoản thay vì xoá."
        onConfirm={doDelete}
      />
    </div>
  );
};

export default UsersPage;
