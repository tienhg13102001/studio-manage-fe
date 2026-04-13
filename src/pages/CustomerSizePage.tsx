import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import ExcelJS from 'exceljs';
import ConfirmModal from '../components/ConfirmModal';
import Modal from '../components/Modal';
import { customerService } from '../services/customerService';
import { studentService } from '../services/studentService';
import type { Customer, Student } from '../types';

type StudentForm = Omit<Student, '_id' | 'createdAt' | 'customerId'>;

const GENDER_LABEL: Record<string, string> = { male: 'Nam', female: 'Nữ' };

const CustomerSizePage = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [copied, setCopied] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<StudentForm>();

  useEffect(() => {
    customerService.getAll({ limit: 200 }).then((r) => setCustomers(r.data));
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setStudents([]);
      return;
    }
    setLoadingStudents(true);
    studentService
      .getAll({ customerId: selectedId })
      .then((r) => setStudents(r.data))
      .finally(() => setLoadingStudents(false));
  }, [selectedId]);

  const selectedCustomer = customers.find((c) => c._id === selectedId);

  const publicUrl = selectedId ? `${window.location.origin}/form/${selectedId}` : '';

  const handleCopy = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleExportExcel = async () => {
    if (!selectedCustomer || students.length === 0) return;

    const className = `${selectedCustomer.className}${selectedCustomer.school ? ' - ' + selectedCustomer.school : ''}`;

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Học sinh');

    // Column widths
    ws.columns = [
      { width: 6 },
      { width: 26 },
      { width: 12 },
      { width: 16 },
      { width: 15 },
      { width: 32 },
    ];

    // Row 1: Tên lớp
    ws.addRow([`Lớp: ${className}`]);
    ws.getRow(1).font = { bold: true, size: 13 };

    // Row 2: Sĩ số
    ws.addRow([`Sĩ số: ${students.length} học sinh`]);
    ws.getRow(2).font = { italic: true, size: 11 };

    // Row 3: trống
    ws.addRow([]);

    // Row 4: Header
    const headerRow = ws.addRow(['STT', 'Họ tên', 'Giới tính', 'Chiều cao (cm)', 'Cân nặng (kg)', 'Ghi chú']);
    headerRow.font = { bold: true };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' },
      };
    });

    // Data rows
    const border: Partial<ExcelJS.Borders> = {
      top: { style: 'thin' }, left: { style: 'thin' },
      bottom: { style: 'thin' }, right: { style: 'thin' },
    };
    students.forEach((s, i) => {
      const row = ws.addRow([
        i + 1,
        s.name,
        GENDER_LABEL[s.gender],
        s.height ?? '',
        s.weight ?? '',
        s.notes ?? '',
      ]);
      row.eachCell({ includeEmpty: true }, (cell, colNum) => {
        cell.border = border;
        if (colNum === 1 || colNum === 3 || colNum === 4 || colNum === 5)
          cell.alignment = { horizontal: 'center' };
      });
    });

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bảng Size - ${className}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openCreate = () => {
    setEditing(null);
    reset({ name: '', gender: 'male', height: undefined, weight: undefined, notes: '' });
    setModalOpen(true);
  };

  const openEdit = (s: Student) => {
    setEditing(s);
    reset({ name: s.name, gender: s.gender, height: s.height, weight: s.weight, notes: s.notes });
    setModalOpen(true);
  };

  const onSubmit = async (data: StudentForm) => {
    try {
      if (editing) {
        const updated = await studentService.update(editing._id, data);
        setStudents((prev) => prev.map((s) => (s._id === updated._id ? updated : s)));
        toast.success('Cập nhật học sinh thành công!');
      } else {
        const created = await studentService.create({ ...data, customerId: selectedId });
        setStudents((prev) => [...prev, created]);
        toast.success('Thêm học sinh thành công!');
      }
      setModalOpen(false);
    } catch {
      toast.error('Có lỗi xảy ra, vui lòng thử lại.');
    }
  };

  const handleDelete = (id: string) => setConfirmId(id);

  const doDelete = async () => {
    if (!confirmId) return;
    try {
      await studentService.remove(confirmId);
      setStudents((prev) => prev.filter((s) => s._id !== confirmId));
      toast.success('Đã xoá học sinh.');
    } catch {
      toast.error('Xoá thất bại, vui lòng thử lại.');
    }
    setConfirmId(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Thông tin học sinh</h2>
      </div>

      {/* Class selector */}
      <div className="card p-4 mb-4 flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-gray-700 shrink-0">Chọn lớp:</label>
        <select
          className="input flex-1 min-w-[200px]"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          <option value="">-- Chọn lớp --</option>
          {customers.map((c) => (
            <option key={c._id} value={c._id}>
              {c.className}
              {c.school ? ` — ${c.school}` : ''}
            </option>
          ))}
        </select>
        <button
          onClick={handleCopy}
          disabled={!selectedId}
          className={`btn-secondary text-sm shrink-0 ${!selectedId ? 'opacity-40 cursor-not-allowed' : ''}`}
          title={publicUrl}
        >
          {copied ? '✅ Đã copy!' : '🔗 Copy link nhập liệu'}
        </button>
        <button
          onClick={handleExportExcel}
          disabled={!selectedId || students.length === 0}
          className={`btn-secondary text-sm shrink-0 ${!selectedId || students.length === 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          📅 Xuất Excel
        </button>
      </div>

      {/* Empty state */}
      {!selectedId && (
        <div className="card py-16 text-center text-gray-400">
          <div className="text-4xl mb-3">🏫</div>
          <p className="text-base font-medium">Xin mời chọn lớp để xem danh sách học sinh</p>
          <p className="text-sm mt-1">Sau đó bạn có thể copy link để học sinh tự nhập thông tin</p>
        </div>
      )}

      {/* Student list */}
      {selectedId && (
        <>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500">
              Lớp <span className="font-semibold text-gray-800">{selectedCustomer?.className}</span>{' '}
              — {students.length} học sinh
            </p>
            <button onClick={openCreate} className="btn-primary text-sm">
              + Thêm học sinh
            </button>
          </div>

          {loadingStudents ? (
            <p className="text-gray-400 text-sm">Đang tải…</p>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block card p-0 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600 border-b">
                    <tr>
                      <th className="text-left px-4 py-3">#</th>
                      <th className="text-left px-4 py-3">Họ tên</th>
                      <th className="text-left px-4 py-3">Giới tính</th>
                      <th className="text-right px-4 py-3">Chiều cao (cm)</th>
                      <th className="text-right px-4 py-3">Cân nặng (kg)</th>
                      <th className="text-left px-4 py-3">Ghi chú</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s, i) => (
                      <tr key={s._id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                        <td className="px-4 py-3 font-medium">{s.name}</td>
                        <td className="px-4 py-3 text-gray-600">{GENDER_LABEL[s.gender]}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{s.height ?? '—'}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{s.weight ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{s.notes}</td>
                        <td className="px-4 py-3 text-right space-x-2">
                          <button
                            onClick={() => openEdit(s)}
                            className="text-blue-600 hover:underline text-xs"
                          >
                            Sửa
                          </button>
                          <button
                            onClick={() => handleDelete(s._id)}
                            className="text-red-600 hover:underline text-xs"
                          >
                            Xoá
                          </button>
                        </td>
                      </tr>
                    ))}
                    {students.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                          Chưa có học sinh nào
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {students.map((s, i) => (
                  <div key={s._id} className="card p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs text-gray-400 mr-1">{i + 1}.</span>
                        <span className="font-semibold">{s.name}</span>
                        <span className="ml-2 text-sm text-gray-500">{GENDER_LABEL[s.gender]}</span>
                      </div>
                    </div>
                    <div className="flex gap-4 text-sm text-gray-600 mt-1">
                      {s.height && <span>📏 {s.height} cm</span>}
                      {s.weight && <span>⚖️ {s.weight} kg</span>}
                    </div>
                    {s.notes && <p className="text-xs text-gray-400 mt-1">{s.notes}</p>}
                    <div className="flex gap-4 mt-3 pt-3 border-t border-gray-100">
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
                    </div>
                  </div>
                ))}
                {students.length === 0 && (
                  <div className="card py-10 text-center text-gray-400">Chưa có học sinh nào</div>
                )}
              </div>
            </>
          )}
        </>
      )}

      <ConfirmModal
        isOpen={!!confirmId}
        message="Bạn có chắc muốn xoá học sinh này?"
        onConfirm={doDelete}
        onCancel={() => setConfirmId(null)}
      />
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Sửa học sinh' : 'Thêm học sinh'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="label">Họ tên *</label>
              <input {...register('name', { required: true })} className="input" />
            </div>
            <div>
              <label className="label">Giới tính *</label>
              <select {...register('gender', { required: true })} className="input">
                <option value="male">Nam</option>
                <option value="female">Nữ</option>
              </select>
            </div>
            <div>
              <label className="label">Chiều cao (cm)</label>
              <input
                {...register('height', { valueAsNumber: true })}
                type="number"
                step="0.1"
                className="input"
              />
            </div>
            <div>
              <label className="label">Cân nặng (kg)</label>
              <input
                {...register('weight', { valueAsNumber: true })}
                type="number"
                step="0.1"
                className="input"
              />
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
    </div>
  );
};

export default CustomerSizePage;
