import { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'react-toastify';
import { costumeService } from '../services/costumeService';
import { ConfirmModal, DataTable, Modal, ScheduleCalendar } from '../components/organisms';
import type { Column } from '../components/organisms';
import { scheduleService } from '../services/scheduleService';
import type { ScheduleResponse, CostumeResponse } from '../types';
import { ROLE_LABELS } from '../types';
import { formatDate } from '../utils/format';
import { TableSkeleton, Select } from '../components/atoms';
import {
  SCHEDULE_STATUS_COLOR as statusColor,
  SCHEDULE_STATUS_LABEL as statusLabel,
} from '../utils/scheduleConstants';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchSchedules } from '../store/slices/schedulesSlice';
import { fetchCustomers } from '../store/slices/customersSlice';
import { fetchPackages } from '../store/slices/packagesSlice';
import { fetchPhotographers, fetchSales } from '../store/slices/usersSlice';

interface FilterState {
  status: string;
  dateFrom: string;
  dateTo: string;
  customer: string;
}

const defaultFilter: FilterState = { status: '', dateFrom: '', dateTo: '', customer: '' };

interface ScheduleFormValues {
  customer: string;
  package?: string;
  shootDate: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  leadPhotographer?: string;
  bookedBy?: string;
  notes?: string;
}

const SchedulesPage = () => {
  const dispatch = useAppDispatch();
  const { list: schedules, loading } = useAppSelector((s) => s.schedules);
  const { list: customers } = useAppSelector((s) => s.customers);
  const { list: packages } = useAppSelector((s) => s.packages);
  const { photographers, sales: salesUsers } = useAppSelector((s) => s.users);
  const [filter, setFilter] = useState<FilterState>(defaultFilter);
  const [allCostumes, setAllCostumes] = useState<CostumeResponse[]>([]);
  const [selectedCostumes, setSelectedCostumes] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ScheduleResponse | null>(null);
  const [supportIds, setSupportIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
  const [detail, setDetail] = useState<ScheduleResponse | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { isSubmitting },
    watch,
  } = useForm<ScheduleFormValues>();

  const buildFilterParams = (f: FilterState): Record<string, string> => {
    const params: Record<string, string> = {};
    if (f.status) params.status = f.status;
    if (f.dateFrom) params.dateFrom = f.dateFrom;
    if (f.dateTo) params.dateTo = f.dateTo;
    if (f.customer) params.customer = f.customer;
    return params;
  };

  const selectedPackageId = watch('package');
  const selectedPackage = packages.find((p) => p._id === selectedPackageId);
  // IDs of CostumeTypes linked to the selected package
  const packageTypeIds = new Set((selectedPackage?.costumes ?? []).map((ct) => ct._id));
  // Costumes whose type belongs to the selected package
  const availableCostumes = allCostumes.filter(
    (c) => c.type && packageTypeIds.has(c.type._id),
  );

  useEffect(() => {
    dispatch(fetchSchedules({}));
    dispatch(fetchCustomers({ limit: 200 }));
    dispatch(fetchPackages());
    dispatch(fetchPhotographers());
    dispatch(fetchSales());
    costumeService.getAll().then(setAllCostumes);
  }, [dispatch]);

  const openCreate = () => {
    setEditing(null);
    setSupportIds([]);
    setSelectedCostumes([]);
    reset({ status: 'pending' });
    setModalOpen(true);
  };

  const openEdit = (s: ScheduleResponse) => {
    setEditing(s);
    const leadId = s.leadPhotographer?._id ?? '';
    const supIds = s.supportPhotographers.map((u) => u._id);
    setSupportIds(supIds);
    setSelectedCostumes(s.costumes?.map((c) => c._id) ?? []);
    reset({
      customer: s.customer._id,
      package: s.package?._id ?? '',
      shootDate: s.shootDate.slice(0, 10),
      startTime: s.startTime,
      endTime: s.endTime,
      location: s.location,
      status: s.status,
      notes: s.notes,
      leadPhotographer: leadId,
      bookedBy: s.bookedBy?._id ?? '',
    });
    setModalOpen(true);
  };

  const onSubmit = async (data: ScheduleFormValues) => {
    const payload = {
      ...data,
      costumes: selectedCostumes,
      leadPhotographer: data.leadPhotographer || undefined,
      bookedBy: data.bookedBy || undefined,
      supportPhotographers: supportIds,
    };
    try {
      if (editing) {
        await scheduleService.update(editing._id, payload);
        toast.success('Cập nhật lịch chụp thành công!');
      } else {
        await scheduleService.create(payload);
        toast.success('Thêm lịch chụp thành công!');
      }
      setModalOpen(false);
      dispatch(fetchSchedules(buildFilterParams(filter)));
    } catch {
      toast.error('Có lỗi xảy ra, vui lòng thử lại.');
    }
  };

  const [confirmId, setConfirmId] = useState<string | null>(null);

  const handleDelete = (id: string) => setConfirmId(id);

  const doDelete = async () => {
    if (!confirmId) return;
    try {
      await scheduleService.remove(confirmId);
      toast.success('Đã xoá lịch chụp.');
      dispatch(fetchSchedules(buildFilterParams(filter)));
    } catch {
      toast.error('Xoá thất bại, vui lòng thử lại.');
    }
    setConfirmId(null);
  };

  const handleDownloadContract = async (s: ScheduleResponse) => {
    const customer = s.customer;
    const filename = `${customer?.className?.replace(/\s+/g, '-') ?? s._id}-${customer?.school?.replace(/\s+/g, '-') ?? ''}`;
    await scheduleService.downloadContract(s._id, filename);
  };

  const applyFilter = () => dispatch(fetchSchedules(buildFilterParams(filter)));
  const resetFilter = () => {
    setFilter(defaultFilter);
    dispatch(fetchSchedules({}));
  };

  const calendarItems = useMemo(
    () =>
      schedules.map((s) => ({
        _id: s._id,
        shootDate: s.shootDate,
        startTime: s.startTime,
        endTime: s.endTime,
        location: s.location,
        status: s.status,
        notes: s.notes,
        className: s.customer?.className ?? '—',
        leadName: s.leadPhotographer?.name ?? s.leadPhotographer?.username,
      })),
    [schedules],
  );

  const scheduleColumns: Column<ScheduleResponse>[] = [
    {
      key: 'date',
      header: 'Ngày chụp',
      className: 'font-medium max-w-14',
      render: (s) => (
        <div className="flex flex-col">
          <span>{formatDate(s.shootDate)} </span>
          <span className="text-gray-500 text-xs whitespace-nowrap">{`${s.startTime ?? ''}${s.endTime ? ` – ${s.endTime}` : ''}`}</span>
        </div>
      ),
    },
    {
      key: 'class',
      header: 'Lớp',
      className: 'text-primary-600',
      render: (s) => (
        <div className="flex flex-col">
          <span className="font-medium">{s.customer?.className ?? '—'}</span>
          <span className="text-gray-600 text-xs">{s.customer?.school ?? ''}</span>
        </div>
      ),
    },
    {
      key: 'package',
      header: 'Gói chụp',
      className: 'text-gray-600',
      render: (s) => s.package?.name ?? '—',
    },
    {
      key: 'sale',
      header: 'Sale',
      className: 'text-gray-600',
      render: (s) => s.bookedBy?.name ?? s.bookedBy?.username ?? '—',
    },
    {
      key: 'leader',
      header: 'Leader',
      className: 'text-gray-600',
      render: (s) => s.leadPhotographer?.name ?? s.leadPhotographer?.username ?? '—',
    },
    {
      key: 'support',
      header: 'Support',
      className: 'text-gray-600 max-w-24',
      render: (s) =>
        s.supportPhotographers.map((u) => u.name ?? u.username).join(', ') || '—',
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (s) => (
        <span className={`badge ${statusColor[s.status]}`}>{statusLabel[s.status]}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (s) => (
        <span className="space-x-2">
          <button
            onClick={() => handleDownloadContract(s)}
            className="text-green-600 hover:underline text-xs"
          >
            Hợp đồng
          </button>
          <button onClick={() => openEdit(s)} className="text-blue-600 hover:underline text-xs">
            Sửa
          </button>
          <button
            onClick={() => handleDelete(s._id)}
            className="text-red-600 hover:underline text-xs"
          >
            Xoá
          </button>
        </span>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">Lịch chụp</h2>
        <div className="flex items-center gap-2 justify-between w-full md:w-auto">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === 'table' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              ☰ Bảng
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 text-sm font-medium transition-colors border-l border-gray-200 ${viewMode === 'calendar' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              ◫ Lịch
            </button>
          </div>
          <button onClick={openCreate} className="btn-primary">
            + Thêm lịch
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="flex flex-wrap gap-2">
          <div className="flex-1 min-w-[8rem]">
            <Select
              options={[
                { value: '', label: 'Tất cả trạng thái' },
                ...Object.entries(statusLabel).map(([v, l]) => ({ value: v, label: l })),
              ]}
              value={filter.status}
              onChange={(v) => setFilter((f) => ({ ...f, status: v as string }))}
            />
          </div>
          <div className="flex-1 min-w-[8rem]">
            <Select
              options={[
                { value: '', label: 'Tất cả lớp' },
                ...customers.map((c) => ({ value: c._id, label: c.className })),
              ]}
              value={filter.customer}
              onChange={(v) => setFilter((f) => ({ ...f, customer: v as string }))}
            />
          </div>
          <input
            type="date"
            className="input flex-1 min-w-[8rem]"
            value={filter.dateFrom}
            onChange={(e) => setFilter((f) => ({ ...f, dateFrom: e.target.value }))}
          />
          <input
            type="date"
            className="input flex-1 min-w-[8rem]"
            value={filter.dateTo}
            onChange={(e) => setFilter((f) => ({ ...f, dateTo: e.target.value }))}
          />
          <button onClick={applyFilter} className="btn-primary">
            Lọc
          </button>
          <button onClick={resetFilter} className="btn-secondary">
            Xoá lọc
          </button>
        </div>
      </div>

      {loading ? (
        <TableSkeleton cols={11} />
      ) : viewMode === 'calendar' ? (
        <div className="card p-4">
          <ScheduleCalendar
            items={calendarItems}
            onEdit={(id) => {
              const s = schedules.find((x) => x._id === id);
              if (s) openEdit(s);
            }}
            onDelete={handleDelete}
          />
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <DataTable<ScheduleResponse>
              data={schedules}
              keyExtractor={(s) => s._id}
              emptyTitle="Chưa có dữ liệu"
              columns={scheduleColumns}
              onRowClick={(s) => setDetail(s)}
            />
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {schedules.map((s) => {
              const customer = s.customer;
              const leadName = s.leadPhotographer?.name ?? s.leadPhotographer?.username ?? null;
              const bookedByName = s.bookedBy?.name ?? s.bookedBy?.username ?? null;
              const supports = s.supportPhotographers
                .map((u) => u.name ?? u.username)
                .join(', ');
              return (
                <div key={s._id} className="card p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-semibold text-gray-900">{formatDate(s.shootDate)}</div>
                      <div className="text-primary-600 text-sm mt-0.5">
                        {customer?.className ?? '—'}
                      </div>
                    </div>
                    <span className={`badge ${statusColor[s.status]}`}>
                      {statusLabel[s.status]}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    {(s.startTime || s.endTime) && (
                      <div>
                        ⏰ {s.startTime}
                        {s.endTime ? ` – ${s.endTime}` : ''}
                      </div>
                    )}
                    {s.location && <div>📍 {s.location}</div>}
                    {leadName && <div>Leader: {leadName}</div>}
                    {supports && <div>Support: {supports}</div>}
                    {s.notes && (
                      <div className="bg-yellow-50 text-yellow-800 text-xs font-medium px-2 py-1 rounded-md border border-yellow-200 mt-1 whitespace-pre-line">
                        📝 <br />
                        {s.notes}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => handleDownloadContract(s)}
                      className="text-green-600 text-xs font-medium"
                    >
                      Hợp đồng
                    </button>
                    <button
                      onClick={() => openEdit(s)}
                      className="text-blue-600 text-xs font-medium"
                    >
                      Sửa
                    </button>
                    <button
                      onClick={() => handleDelete(s._id)}
                      className="text-red-600 text-xs font-medium"
                    >
                      Xoá
                    </button>
                    {bookedByName && (
                      <span className="ml-auto bg-primary-50 text-primary-700 text-xs font-medium px-2 py-0.5 rounded-full border border-primary-200">
                        {bookedByName}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {schedules.length === 0 && (
              <div className="card py-10 text-center text-gray-400">Chưa có dữ liệu</div>
            )}
          </div>
        </>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Sửa lịch chụp' : 'Thêm lịch chụp'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="label">Lớp *</label>
              <Controller
                name="customer"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <Select
                    options={customers.map((c) => ({
                      value: c._id,
                      label: `${c.className} – ${c.school}`,
                    }))}
                    value={field.value ?? ''}
                    onChange={(v) => field.onChange(v)}
                    placeholder="-- Chọn lớp --"
                  />
                )}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Gói chụp</label>
              <Controller
                name="package"
                control={control}
                render={({ field }) => (
                  <Select
                    options={packages.map((p) => ({
                      value: p._id,
                      label: `${p.name} – ${p.pricePerMember.toLocaleString('vi-VN')}₫/thành viên`,
                    }))}
                    value={field.value ?? ''}
                    onChange={(v) => field.onChange(v || undefined)}
                    placeholder="-- Không chọn gói --"
                  />
                )}
              />
            </div>
            {selectedPackageId && (
              <div className="sm:col-span-2">
                <label className="label">Trang phục</label>
                {availableCostumes.length === 0 ? (
                  <p className="text-xs text-gray-400">
                    Gói chụp này chưa có trang phục nào được liên kết.
                  </p>
                ) : (
                  <div className="border border-gray-200 rounded-lg p-2 space-y-1 max-h-40 overflow-y-auto">
                    {availableCostumes.map((c) => (
                      <label
                        key={c._id}
                        className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded"
                      >
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 accent-primary-600"
                          checked={selectedCostumes.includes(c._id)}
                          onChange={(e) =>
                            setSelectedCostumes((prev) =>
                              e.target.checked
                                ? [...prev, c._id]
                                : prev.filter((id) => id !== c._id),
                            )
                          }
                        />
                        <span className="text-sm text-gray-700">{c.name}</span>
                        {c.type && (
                          <span className="text-xs text-gray-400">— {c.type.name}</span>
                        )}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div>
              <label className="label">Ngày chụp *</label>
              <input {...register('shootDate', { required: true })} type="date" className="input" />
            </div>
            <div>
              <label className="label">Trạng thái</label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select
                    options={Object.entries(statusLabel).map(([v, l]) => ({ value: v, label: l }))}
                    value={field.value ?? ''}
                    onChange={(v) => field.onChange(v)}
                  />
                )}
              />
            </div>
            <div>
              <label className="label">Giờ bắt đầu</label>
              <input {...register('startTime')} type="time" className="input" />
            </div>
            <div>
              <label className="label">Giờ kết thúc</label>
              <input {...register('endTime')} type="time" className="input" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Địa điểm</label>
              <input {...register('location')} className="input" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Người chốt lớp (Sale)</label>
              <Controller
                name="bookedBy"
                control={control}
                render={({ field }) => (
                  <Select
                    options={salesUsers.map((u) => ({
                      value: u._id,
                      label: u.username + (u.name ? ` (${u.name})` : ''),
                    }))}
                    value={field.value ?? ''}
                    onChange={(v) => field.onChange(v || undefined)}
                    placeholder="-- Không chỉ định --"
                  />
                )}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Thợ leader</label>
              <Controller
                name="leadPhotographer"
                control={control}
                render={({ field }) => (
                  <Select
                    options={photographers.map((u) => ({
                      value: u._id,
                      label: `${u.username}${u.name ? ` (${u.name})` : ''} – ${ROLE_LABELS[3]}`,
                    }))}
                    value={field.value ?? ''}
                    onChange={(v) => field.onChange(v || undefined)}
                    placeholder="-- Không chỉ định --"
                  />
                )}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Thợ support</label>
              <div className="border border-gray-200 rounded-lg p-2 max-h-36 overflow-y-auto space-y-1">
                {photographers
                  .filter((u) => u._id !== watch('leadPhotographer'))
                  .map((u) => (
                    <label
                      key={u._id}
                      className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded"
                    >
                      <input
                        type="checkbox"
                        className="rounded border-gray-300"
                        checked={supportIds.includes(u._id)}
                        onChange={(e) =>
                          setSupportIds((prev) =>
                            e.target.checked ? [...prev, u._id] : prev.filter((id) => id !== u._id),
                          )
                        }
                      />
                      <span className="text-sm text-gray-700">
                        {u.username}
                        {u.name ? ` (${u.name})` : ''}
                      </span>
                      -<span className="text-xs text-gray-400">{ROLE_LABELS[3]}</span>
                    </label>
                  ))}
                {photographers.length === 0 && (
                  <p className="text-sm text-gray-400 px-1">Không có người dùng phù hợp</p>
                )}
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Ghi chú</label>
              <textarea {...register('notes')} className="input" rows={2} />
            </div>
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
        message="Bạn có chắc muốn xoá lịch chụp này?"
        onConfirm={doDelete}
        onCancel={() => setConfirmId(null)}
      />

      {/* Detail modal */}
      <Modal
        isOpen={!!detail}
        onClose={() => setDetail(null)}
        title="Chi tiết lịch chụp"
        size="lg"
      >
        {detail &&
          (() => {
            const customer = detail.customer;
            const pkg = detail.package;
            const leadName =
              detail.leadPhotographer?.name ?? detail.leadPhotographer?.username ?? null;
            const bookedByName = detail.bookedBy?.name ?? detail.bookedBy?.username ?? null;
            const supports = detail.supportPhotographers
              .map((u) => u.name ?? u.username)
              .filter(Boolean)
              .join(', ');

            const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
              <div className="grid grid-cols-3 gap-3 py-2 border-b last:border-0">
                <div className="text-sm text-gray-500">{label}</div>
                <div className="col-span-2 text-sm text-gray-800">{value || '—'}</div>
              </div>
            );

            return (
              <div className="space-y-1">
                <div className="flex items-center justify-between mb-2">
                  <span className={`badge ${statusColor[detail.status]}`}>
                    {statusLabel[detail.status]}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        handleDownloadContract(detail);
                      }}
                      className="btn-secondary text-sm"
                    >
                      Hợp đồng
                    </button>
                    <button
                      onClick={() => {
                        setDetail(null);
                        openEdit(detail);
                      }}
                      className="btn-primary text-sm"
                    >
                      Sửa
                    </button>
                  </div>
                </div>

                <Row label="Ngày chụp" value={formatDate(detail.shootDate)} />
                <Row
                  label="Giờ"
                  value={`${detail.startTime ?? ''}${detail.endTime ? ` – ${detail.endTime}` : ''}`}
                />
                <Row
                  label="Lớp"
                  value={
                    customer ? (
                      <>
                        <span className="font-medium text-primary-600">{customer.className}</span>
                        {customer.school && (
                          <span className="text-gray-500"> – {customer.school}</span>
                        )}
                      </>
                    ) : (
                      '—'
                    )
                  }
                />
                <Row
                  label="Gói chụp"
                  value={
                    pkg ? (
                      <>
                        {pkg.name}
                        {typeof pkg.pricePerMember === 'number' && (
                          <span className="text-gray-500">
                            {' '}
                            – {pkg.pricePerMember.toLocaleString('vi-VN')}₫/thành viên
                          </span>
                        )}
                      </>
                    ) : (
                      '—'
                    )
                  }
                />
                <Row label="Địa điểm" value={detail.location} />
                <Row label="Sale" value={bookedByName} />
                <Row label="Leader" value={leadName} />
                <Row label="Support" value={supports} />
                <Row
                  label="Ghi chú"
                  value={
                    detail.notes ? (
                      <span className="whitespace-pre-line">{detail.notes}</span>
                    ) : (
                      '—'
                    )
                  }
                />

                <div className="flex justify-end pt-4">
                  <button
                    onClick={() => {
                      if (detail) {
                        const id = detail._id;
                        setDetail(null);
                        handleDelete(id);
                      }
                    }}
                    className="text-red-600 hover:underline text-sm"
                  >
                    Xoá lịch chụp
                  </button>
                </div>
              </div>
            );
          })()}
      </Modal>
    </div>
  );
};

export default SchedulesPage;
