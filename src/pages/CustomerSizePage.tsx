import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import ExcelJS from 'exceljs';
import { ConfirmModal, Modal } from '../components/organisms';
import { TableSkeleton } from '../components/atoms';
import { customerService } from '../services/customerService';
import { studentService } from '../services/studentService';
import type { Customer, Student } from '../types';

type StudentForm = Omit<Student, '_id' | 'createdAt' | 'customerId'>;

const GENDER_LABEL: Record<string, string> = { male: 'Nam', female: 'Nữ' };
const GENDER_FROM_LABEL: Record<string, string> = {
  nam: 'male',
  nữ: 'female',
  male: 'male',
  female: 'female',
};

const normalizeName = (name: string) => name.toLowerCase().trim().replace(/\s+/g, ' ');

interface ImportRow {
  name: string;
  gender: 'male' | 'female';
  height?: number;
  weight?: number;
  notes?: string;
  error?: string;
  warning?: string;
}

const CustomerSizePage = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [copied, setCopied] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [showDupOnly, setShowDupOnly] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting, errors },
  } = useForm<StudentForm>();

  useEffect(() => {
    customerService.getAll({ limit: 200 }).then((r) => setCustomers(r.data));
  }, []);

  useEffect(() => {
    setShowDupOnly(false);
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

  // Find names that appear more than once in the current student list
  const duplicateNorms = useMemo(() => {
    const count = new Map<string, number>();
    students.forEach((s) => {
      const norm = normalizeName(s.name);
      count.set(norm, (count.get(norm) ?? 0) + 1);
    });
    return new Set([...count.entries()].filter(([, n]) => n > 1).map(([k]) => k));
  }, [students]);

  // Auto-disable filter when no duplicates remain
  useEffect(() => {
    if (showDupOnly && duplicateNorms.size === 0) setShowDupOnly(false);
  }, [duplicateNorms, showDupOnly]);

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
    const headerRow = ws.addRow([
      'STT',
      'Họ tên',
      'Giới tính',
      'Chiều cao (cm)',
      'Cân nặng (kg)',
      'Ghi chú',
    ]);
    headerRow.font = { bold: true };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // Data rows
    const border: Partial<ExcelJS.Borders> = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
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
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
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

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      const buffer = await file.arrayBuffer();
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buffer);
      const ws = wb.worksheets[0];
      if (!ws) {
        toast.error('Không đọc được file Excel.');
        return;
      }

      // Find the header row index (the row containing "họ tên" or "stt")
      let headerRowNum = -1;
      ws.eachRow((row, rowNum) => {
        if (headerRowNum !== -1) return;
        const c1 = String(row.getCell(1).value ?? '')
          .trim()
          .toLowerCase();
        const c2 = String(row.getCell(2).value ?? '')
          .trim()
          .toLowerCase();
        if (c1 === 'stt' || c2 === 'họ tên' || c2 === 'ho ten') {
          headerRowNum = rowNum;
        }
      });

      const rows: ImportRow[] = [];
      ws.eachRow((row, rowNum) => {
        // Skip header and any rows before it
        if (rowNum <= headerRowNum) return;

        const name = String(row.getCell(2).value ?? '').trim();
        if (!name) return;

        const genderRaw = String(row.getCell(3).value ?? '')
          .trim()
          .toLowerCase();
        const gender = (GENDER_FROM_LABEL[genderRaw] ?? 'male') as 'male' | 'female';

        const rawHeight = row.getCell(4).value;
        const rawWeight = row.getCell(5).value;
        const height = rawHeight !== null && rawHeight !== '' ? Number(rawHeight) : undefined;
        const weight = rawWeight !== null && rawWeight !== '' ? Number(rawWeight) : undefined;
        const notes = row.getCell(6).value ? String(row.getCell(6).value).trim() : undefined;

        const parsedHeight =
          height !== undefined && !isNaN(height) && height > 0 ? height : undefined;
        const parsedWeight =
          weight !== undefined && !isNaN(weight) && weight > 0 ? weight : undefined;

        const missing = [!parsedHeight && 'chiều cao', !parsedWeight && 'cân nặng']
          .filter(Boolean)
          .join(', ');

        rows.push({
          name,
          gender,
          height: parsedHeight,
          weight: parsedWeight,
          notes,
          error: missing ? `Thiếu ${missing}` : undefined,
        });
      });

      if (rows.length === 0) {
        toast.error('Không tìm thấy dữ liệu học sinh trong file.');
        return;
      }

      // Duplicate detection
      const existingByNorm = new Map(students.map((s) => [normalizeName(s.name), s.name]));
      const seenInFile = new Map<string, number>(); // norm -> first occurrence index
      rows.forEach((r, i) => {
        const norm = normalizeName(r.name);
        if (existingByNorm.has(norm)) {
          const existingName = existingByNorm.get(norm)!;
          r.warning = `Trùng với "${existingName}" đã có trong lớp`;
        } else if (seenInFile.has(norm)) {
          const firstIdx = seenInFile.get(norm)!;
          r.warning = `Có thể trùng với dòng ${firstIdx + 1}`;
          // Also mark the first occurrence if not already warned
          if (!rows[firstIdx].warning) {
            rows[firstIdx].warning = `Có thể trùng với dòng ${i + 1}`;
          }
        } else {
          seenInFile.set(norm, i);
        }
      });

      setImportRows(rows);
      setImportModalOpen(true);
    } catch {
      toast.error('Đọc file thất bại, vui lòng kiểm tra định dạng.');
    }
  };

  const handleConfirmImport = async () => {
    const valid = importRows.filter((r) => !r.error && r.name);
    if (valid.length === 0) return;
    setImporting(true);
    setImportProgress(0);
    let success = 0;
    for (let i = 0; i < valid.length; i++) {
      try {
        const created = await studentService.create({ ...valid[i], customerId: selectedId });
        setStudents((prev) => [...prev, created]);
        success++;
      } catch {
        // continue on individual failure
      }
      setImportProgress(Math.round(((i + 1) / valid.length) * 100));
    }
    setImporting(false);
    setImportModalOpen(false);
    setImportRows([]);
    toast.success(`Đã import ${success}/${valid.length} học sinh.`);
  };

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
        <button
          onClick={() => importFileRef.current?.click()}
          disabled={!selectedId}
          className={`btn-secondary text-sm shrink-0 ${!selectedId ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          📥 Nhập từ Excel
        </button>
        <input
          ref={importFileRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={handleImportFileChange}
        />
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
              {duplicateNorms.size > 0 && (
                <span className="ml-2 text-yellow-600 font-medium">
                  ⚠{' '}
                  {[...duplicateNorms].reduce(
                    (acc, norm) =>
                      acc + students.filter((s) => normalizeName(s.name) === norm).length,
                    0,
                  )}{' '}
                  trùng tên
                </span>
              )}
            </p>
            <div className="flex items-center gap-2">
              {duplicateNorms.size > 0 && (
                <button
                  onClick={() => setShowDupOnly((v) => !v)}
                  className={`text-sm px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                    showDupOnly
                      ? 'bg-yellow-100 border-yellow-400 text-yellow-800'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-yellow-50 hover:border-yellow-300'
                  }`}
                >
                  ⚠ {showDupOnly ? 'Hiện tất cả' : 'Chỉ hiện trùng tên'}
                </button>
              )}
              <button onClick={openCreate} className="btn-primary text-sm">
                + Thêm học sinh
              </button>
            </div>
          </div>

          {loadingStudents ? (
            <TableSkeleton cols={7} rows={4} />
          ) : (
            (() => {
              const displayedStudents = showDupOnly
                ? students.filter((s) => duplicateNorms.has(normalizeName(s.name)))
                : students;
              return (
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
                        {displayedStudents.map((s, i) => {
                          const isDup = duplicateNorms.has(normalizeName(s.name));
                          return (
                            <tr
                              key={s._id}
                              className={`border-b last:border-0 ${isDup ? 'bg-yellow-50' : 'hover:bg-gray-50'}`}
                            >
                              <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                              <td className="px-4 py-3 font-medium">
                                {s.name}
                                {isDup && (
                                  <span className="ml-1.5 text-yellow-600 text-xs">
                                    ⚠ trùng tên
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-gray-600">{GENDER_LABEL[s.gender]}</td>
                              <td className="px-4 py-3 text-right text-gray-600">
                                {s.height ?? '—'}
                              </td>
                              <td className="px-4 py-3 text-right text-gray-600">
                                {s.weight ?? '—'}
                              </td>
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
                          );
                        })}
                        {displayedStudents.length === 0 && (
                          <tr>
                            <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                              {showDupOnly ? (
                                <span>
                                  Không còn học sinh trùng tên —{' '}
                                  <button
                                    className="underline text-blue-500"
                                    onClick={() => setShowDupOnly(false)}
                                  >
                                    Hiện tất cả
                                  </button>
                                </span>
                              ) : (
                                'Chưa có học sinh nào'
                              )}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <div className="md:hidden space-y-3">
                    {displayedStudents.map((s, i) => {
                      const isDup = duplicateNorms.has(normalizeName(s.name));
                      return (
                        <div
                          key={s._id}
                          className={`card p-4 ${isDup ? 'border-yellow-300 bg-yellow-50' : ''}`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <span className="text-xs text-gray-400 mr-1">{i + 1}.</span>
                              <span className="font-semibold">{s.name}</span>
                              <span className="ml-2 text-sm text-gray-500">
                                {GENDER_LABEL[s.gender]}
                              </span>
                              {isDup && (
                                <span className="ml-1.5 text-yellow-600 text-xs">⚠ trùng tên</span>
                              )}
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
                      );
                    })}
                    {displayedStudents.length === 0 && (
                      <div className="card py-10 text-center text-gray-400">
                        {showDupOnly ? (
                          <span>
                            Không còn học sinh trùng tên —{' '}
                            <button
                              className="underline text-blue-500"
                              onClick={() => setShowDupOnly(false)}
                            >
                              Hiện tất cả
                            </button>
                          </span>
                        ) : (
                          'Không có học sinh nào'
                        )}
                      </div>
                    )}
                  </div>
                </>
              );
            })()
          )}
        </>
      )}

      <ConfirmModal
        isOpen={!!confirmId}
        message="Bạn có chắc muốn xoá học sinh này?"
        onConfirm={doDelete}
        onCancel={() => setConfirmId(null)}
      />

      {/* Import preview modal */}
      <Modal
        isOpen={importModalOpen}
        onClose={() => {
          if (!importing) {
            setImportModalOpen(false);
            setImportRows([]);
          }
        }}
        title={`Xem trước dữ liệu import — ${importRows.filter((r) => !r.error).length} học sinh`}
        size="lg"
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            Hệ thống đọc được{' '}
            <span className="font-semibold text-gray-800">{importRows.length}</span> dòng.
            {importRows.some((r) => r.error) && (
              <span className="text-red-500 ml-1">
                {importRows.filter((r) => r.error).length} dòng lỗi sẽ bị bỏ qua.
              </span>
            )}
            {importRows.some((r) => r.warning) && (
              <span className="text-yellow-600 ml-1">
                {importRows.filter((r) => r.warning).length} dòng có thể bị trùng tên.
              </span>
            )}
          </p>
          <div className="max-h-72 overflow-y-auto border rounded-lg">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-gray-600 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2">#</th>
                  <th className="text-left px-3 py-2">Họ tên</th>
                  <th className="text-left px-3 py-2">Giới tính</th>
                  <th className="text-right px-3 py-2">Cao (cm)</th>
                  <th className="text-right px-3 py-2">Nặng (kg)</th>
                  <th className="text-left px-3 py-2">Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {importRows.map((r, i) => (
                  <tr
                    key={i}
                    className={`border-t ${r.error ? 'bg-red-50 text-red-400' : r.warning ? 'bg-yellow-50' : 'hover:bg-gray-50'}`}
                  >
                    <td className="px-3 py-1.5 text-gray-400">{i + 1}</td>
                    <td className="px-3 py-1.5 font-medium">
                      {r.name || <span className="italic">trống</span>}
                    </td>
                    <td className="px-3 py-1.5">{GENDER_LABEL[r.gender] ?? r.gender}</td>
                    <td className="px-3 py-1.5 text-right">{r.height ?? '—'}</td>
                    <td className="px-3 py-1.5 text-right">{r.weight ?? '—'}</td>
                    <td className="px-3 py-1.5 text-gray-400">
                      {r.notes ?? ''}
                      {r.error && <span className="text-red-500 ml-1">({r.error})</span>}
                      {r.warning && <span className="text-yellow-600 ml-1">⚠ {r.warning}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {importing && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Đang import…</span>
                <span>{importProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className="bg-primary-600 h-1.5 rounded-full transition-all"
                  style={{ width: `${importProgress}%` }}
                />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setImportModalOpen(false);
                setImportRows([]);
              }}
              disabled={importing}
              className="btn-secondary"
            >
              Huỷ
            </button>
            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={importing || importRows.filter((r) => !r.error).length === 0}
              className="btn-primary"
            >
              {importing
                ? 'Đang import…'
                : `Import ${importRows.filter((r) => !r.error).length} học sinh`}
            </button>
          </div>
        </div>
      </Modal>
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
              <label className="label">Chiều cao (cm) *</label>
              <input
                {...register('height', {
                  required: 'Vui lòng nhập chiều cao',
                  valueAsNumber: true,
                  min: { value: 1, message: 'Chiều cao không hợp lệ' },
                })}
                type="number"
                step="0.1"
                className="input"
              />
              {errors.height && (
                <p className="text-red-500 text-xs mt-1">{errors.height.message}</p>
              )}
            </div>
            <div>
              <label className="label">Cân nặng (kg) *</label>
              <input
                {...register('weight', {
                  required: 'Vui lòng nhập cân nặng',
                  valueAsNumber: true,
                  min: { value: 1, message: 'Cân nặng không hợp lệ' },
                })}
                type="number"
                step="0.1"
                className="input"
              />
              {errors.weight && (
                <p className="text-red-500 text-xs mt-1">{errors.weight.message}</p>
              )}
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
