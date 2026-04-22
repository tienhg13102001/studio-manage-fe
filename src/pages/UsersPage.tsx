import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { userService } from '../services/userService';
import { ConfirmModal, DataTable, Modal } from '../components/organisms';
import type { Column } from '../components/organisms';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchUsers } from '../store/slices/usersSlice';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS } from '../types';
import type { User, UserRole } from '../types';

const ROLE_BADGE: Record<UserRole, string> = {
  0: 'bg-purple-100 text-purple-800',
  1: 'bg-indigo-100 text-indigo-800',
  2: 'bg-blue-100 text-blue-800',
  3: 'bg-orange-100 text-orange-800',
  4: 'bg-teal-100 text-teal-800',
  5: 'bg-amber-100 text-amber-800',
};

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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Quản lý người dùng</h2>
        <button onClick={openCreate} className="btn-primary">
          + Thêm người dùng
        </button>
      </div>

      <div className="hidden md:block">
        <DataTable<User>
          data={users}
          keyExtractor={(u) => u._id}
          columns={[
            {
              key: 'username',
              header: 'Tên đăng nhập',
              render: (u) => (
                <span className="font-medium">
                  {u.username}
                  {u._id === me?._id && <span className="ml-2 text-xs text-gray-400">(bạn)</span>}
                </span>
              ),
            },
            {
              key: 'name',
              header: 'Họ tên',
              render: (u) => <span className="text-gray-600">{u.name ?? '—'}</span>,
            },
            {
              key: 'roles',
              header: 'Role',
              render: (u) => (
                <div className="flex flex-wrap gap-1">
                  {(u.roles ?? []).map((r) => (
                    <span key={r} className={`badge ${ROLE_BADGE[r]}`}>
                      {ROLE_LABELS[r]}
                    </span>
                  ))}
                </div>
              ),
            },
            {
              key: 'status',
              header: 'Trạng thái',
              render: (u) => (
                <span
                  className={`badge ${u.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                >
                  {u.isActive ? 'Hoạt động' : 'Đã khoá'}
                </span>
              ),
            },
            {
              key: 'actions',
              header: '',
              align: 'right',
              className: 'whitespace-nowrap',
              render: (u) => (
                <span className="space-x-2">
                  <button
                    onClick={() => openEdit(u)}
                    className="text-blue-600 hover:underline text-xs"
                  >
                    Sửa
                  </button>
                  {u._id !== me?._id && (
                    <button
                      onClick={() => handleDelete(u._id)}
                      className="text-red-600 hover:underline text-xs"
                    >
                      Xoá
                    </button>
                  )}
                </span>
              ),
            } satisfies Column<User>,
          ]}
        />
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {users.map((u) => (
          <div key={u._id} className="card p-4">
            <div className="flex items-start justify-between mb-1">
              <div>
                <div className="font-semibold text-gray-900">
                  {u.username}
                  {u._id === me?._id && <span className="ml-2 text-xs text-gray-400">(bạn)</span>}
                </div>
                {u.name && <div className="text-sm text-gray-600">{u.name}</div>}
              </div>
              <span
                className={`badge ${u.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
              >
                {u.isActive ? 'Hoạt động' : 'Đã khoá'}
              </span>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {(u.roles ?? []).map((r) => (
                <span key={r} className={`badge ${ROLE_BADGE[r]}`}>
                  {ROLE_LABELS[r]}
                </span>
              ))}
            </div>
            <div className="flex gap-4 mt-3 pt-3 border-t border-gray-100">
              <button onClick={() => openEdit(u)} className="text-blue-600 text-xs font-medium">
                Sửa
              </button>
              {u._id !== me?._id && (
                <button
                  onClick={() => handleDelete(u._id)}
                  className="text-red-600 text-xs font-medium"
                >
                  Xoá
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Sửa người dùng' : 'Thêm người dùng'}
        size="sm"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <label className="label">Tên đăng nhập *</label>
            <input
              {...register('username', { required: true })}
              className="input"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="label">Họ tên</label>
            <input {...register('name')} className="input" />
          </div>
          <div>
            <label className="label">
              {editing ? 'Mật khẩu mới (để trống = không đổi)' : 'Mật khẩu *'}
            </label>
            <input
              {...register('password', { required: !editing })}
              type="password"
              className="input"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="label">Role</label>
            <div className="border border-gray-200 rounded-lg p-2 space-y-1">
              {(Object.entries(ROLE_LABELS) as [string, string][]).map(([val, label]) => {
                const r = Number(val) as UserRole;
                return (
                  <label
                    key={r}
                    className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded"
                  >
                    <input
                      type="checkbox"
                      className="rounded border-gray-300"
                      checked={selectedRoles.includes(r)}
                      onChange={() => toggleRole(r)}
                    />
                    <span className={`badge ${ROLE_BADGE[r]}`}>{label}</span>
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
              className="rounded border-gray-300"
            />
            <label htmlFor="isActive" className="text-sm text-gray-700">
              Đang hoạt động
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">
              Huỷ
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              Lưu
            </button>
          </div>
        </form>
      </Modal>
      <ConfirmModal
        isOpen={!!confirmId}
        message="Bạn có chắc muốn xoá tài khoản này?"
        onConfirm={doDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
};

export default UsersPage;
