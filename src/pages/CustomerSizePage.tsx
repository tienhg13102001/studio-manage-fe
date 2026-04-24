import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'react-toastify';
import ExcelJS from 'exceljs';
import { ConfirmModal, DataTable, Modal } from '../components/organisms';
import type { Column } from '../components/organisms';
import { TableSkeleton, Select } from '../components/atoms';
import { customerService } from '../services/customerService';
import { studentService } from '../services/studentService';
import { scheduleService } from '../services/scheduleService';
import type { Customer, ScheduleResponse, Student, StudentResponse } from '../types';
import dayjs from 'dayjs';
import {
  FaCalendarAlt,
  FaClipboardCheck,
  FaCopy,
  FaFileImport,
  FaGraduationCap,
  FaRulerVertical,
  FaSchool,
  FaWeight,
} from 'react-icons/fa';
import { FiAlertTriangle } from 'react-icons/fi';

type StudentForm = Omit<Student, '_id' | 'createdAt' | 'customer'>;

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
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [students, setStudents] = useState<StudentResponse[]>([]);
  const [schedules, setSchedules] = useState<ScheduleResponse | null>();
  const [totalMale, setTotalMale] = useState(0);
  const [totalFemale, setTotalFemale] = useState(0);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedInfo, setCopiedInfo] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<StudentResponse | null>(null);
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
    control,
    watch,
    setValue,
    formState: { isSubmitting, errors },
  } = useForm<StudentForm>();

  const formGender = watch('gender');
  const scheduleCostumes = schedules?.costumes ?? [];
  const visibleCostumes = scheduleCostumes.filter(
    (c) => c.gender === formGender || c.gender === 'unisex',
  );

  // When user changes gender inside the modal, re-tick all visible costumes.
  // Skip the first run after the modal opens so we preserve the pre-filled
  // selection from openCreate / openEdit.
  const prevGenderRef = useRef<string | null>(null);
  useEffect(() => {
    if (!modalOpen) {
      prevGenderRef.current = null;
      return;
    }
    if (prevGenderRef.current === null) {
      prevGenderRef.current = formGender;
      return;
    }
    if (prevGenderRef.current !== formGender) {
      prevGenderRef.current = formGender;
      setValue(
        'costumes',
        scheduleCostumes
          .filter((c) => c.gender === formGender || c.gender === 'unisex')
          .map((c) => c._id),
      );
    }
  }, [formGender, modalOpen, scheduleCostumes, setValue]);

  useEffect(() => {
    customerService.getAll({ limit: 200 }).then((r) => setCustomers(r.data));
  }, []);

  useEffect(() => {
    setShowDupOnly(false);
    if (!selectedCustomer) {
      setStudents([]);
      setTotalMale(0);
      setTotalFemale(0);
      return;
    }
    setLoadingStudents(true);
    studentService
      .getAll({ customer: selectedCustomer._id })
      .then((r) => {
        setStudents(r.data);
        setTotalMale(r.totalMale ?? 0);
        setTotalFemale(r.totalFemale ?? 0);
      })
      .finally(() => setLoadingStudents(false));
    scheduleService
      .getByCustomer(selectedCustomer._id)
      .then((r) => setSchedules(r))
      .catch(() => setSchedules(null));
  }, [selectedCustomer]);

  const noSchedule = selectedCustomer ? !schedules : false;
  const disabledAll = !selectedCustomer || noSchedule;

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

  const publicUrl = selectedCustomer
    ? `${window.location.origin}/form/${selectedCustomer._id}`
    : '';

  const handleCopy = () => {
    if (!selectedCustomer) return;
    const schedule = scheduleService.getByCustomer(selectedCustomer._id);
    if (!schedule) {
      toast.error('Vui lòng tạo lịch chụp cho lớp này trước khi lấy thông tin.');
    }
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleCopyInfo = async () => {
    if (!selectedCustomer) return;
    const schedule = await scheduleService.getByCustomer(selectedCustomer._id);

    if (!schedule) {
      toast.error('Vui lòng tạo lịch chụp cho lớp này trước khi lấy thông tin gửi đồ.');
      return;
    }
    if (totalFemale + totalFemale < selectedCustomer.total) {
      toast.error(
        'Sĩ số nam/nữ hiện tại nhỏ hơn sĩ số đã đăng ký. Vui lòng cập nhật đầy đủ thông tin học sinh trước khi lấy thông tin gửi đồ.',
      );
      return;
    }

    // Build costume lines from costumes selected on the schedule
    let costumeLines = '';
    if (schedule?.costumes && schedule.costumes.length > 0) {
      costumeLines = schedule.costumes
        .map((c) => `- ${totalMale + totalFemale} bộ ${c.name}`)
        .join('\n');
    }

    const info = `
Ngày chụp: ${schedule ? dayjs(schedule.shootDate).format('DD/MM/YYYY') : 'N/A'}
Lớp: ${selectedCustomer?.className}
Trường: ${selectedCustomer?.school ?? 'N/A'}
Sĩ số nam: ${totalMale}
Sĩ số nữ: ${totalFemale}
Người nhận đồ: ${selectedCustomer?.contactName}
SĐT: ${selectedCustomer?.contactPhone || '-'}
Địa chỉ: ${selectedCustomer?.contactAddress || '-'}

Thông tin số lượng đồ
${costumeLines || `- ${totalMale} bộ nam\n- ${totalFemale} bộ nữ`}
- ${totalMale + totalFemale} giấy màu
`;
    navigator.clipboard.writeText(info).then(() => {
      setCopiedInfo(true);
      setTimeout(() => setCopiedInfo(false), 2000);
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
      { width: 32 },
    ];

    // Row 1: Tên lớp
    ws.addRow([`Lớp: ${className}`]);
    ws.getRow(1).font = { bold: true, size: 13 };

    // Row 2: Sĩ số
    ws.addRow([
      `Sĩ số: ${students.length} học sinh đã điền / ${selectedCustomer.total} học sinh đăng ký`,
    ]);
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
      'Trang phục',
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
        s.costumes?.map((c) => c.name).join(', ') ?? '',
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
    reset({
      name: '',
      gender: 'male',
      height: undefined,
      weight: undefined,
      notes: '',
      costumes: scheduleCostumes
        .filter((c) => c.gender === 'male' || c.gender === 'unisex')
        .map((c) => c._id),
    });
    setModalOpen(true);
  };

  const openEdit = (s: StudentResponse) => {
    setEditing(s);
    reset({
      name: s.name,
      gender: s.gender,
      height: s.height,
      weight: s.weight,
      notes: s.notes,
      costumes: s.costumes?.map((c) => c._id) ?? [],
    });
    setModalOpen(true);
  };

  const onSubmit = async (data: StudentForm) => {
    try {
      if (editing) {
        const updated = await studentService.update(editing._id, data);
        setStudents((prev) => prev.map((s) => (s._id === updated._id ? updated : s)));
        if (editing.gender !== updated.gender) {
          if (editing.gender === 'male') setTotalMale((v) => Math.max(0, v - 1));
          else if (editing.gender === 'female') setTotalFemale((v) => Math.max(0, v - 1));
          if (updated.gender === 'male') setTotalMale((v) => v + 1);
          else if (updated.gender === 'female') setTotalFemale((v) => v + 1);
        }
        toast.success('Cập nhật học sinh thành công!');
      } else {
        const created = await studentService.create({ ...data, customer: selectedCustomer!._id });
        setStudents((prev) => [...prev, created]);
        if (created.gender === 'male') setTotalMale((v) => v + 1);
        else if (created.gender === 'female') setTotalFemale((v) => v + 1);
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
        const created = await studentService.create({
          ...valid[i],
          customer: selectedCustomer!._id,
        });
        setStudents((prev) => [...prev, created]);
        if (created.gender === 'male') setTotalMale((v) => v + 1);
        else if (created.gender === 'female') setTotalFemale((v) => v + 1);
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
      const removed = students.find((s) => s._id === confirmId);
      setStudents((prev) => prev.filter((s) => s._id !== confirmId));
      if (removed?.gender === 'male') setTotalMale((v) => Math.max(0, v - 1));
      else if (removed?.gender === 'female') setTotalFemale((v) => Math.max(0, v - 1));
      toast.success('Đã xoá học sinh.');
    } catch {
      toast.error('Xoá thất bại, vui lòng thử lại.');
    }
    setConfirmId(null);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <span className="page-kicker">Customers</span>
          <h2 className="page-title">Thông tin học sinh</h2>
          <p className="page-subtitle">Quản lý số đo và thông tin trang phục của từng học sinh.</p>
        </div>
      </div>

      {/* Class selector */}
      <div className="card p-4 mb-4 flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium shrink-0">Chọn lớp:</label>
        <div className="flex-1 min-w-[200px]">
          <Select
            options={customers.map((c) => ({
              value: c._id,
              label: `${c.className}${c.school ? ` — ${c.school}` : ''}`,
            }))}
            value={selectedCustomer?._id ?? ''}
            onChange={(v) => setSelectedCustomer(customers.find((c) => c._id === v) ?? null)}
            placeholder="-- Chọn lớp --"
          />
        </div>
        <button
          onClick={handleCopy}
          disabled={disabledAll}
          className={`btn-secondary text-sm shrink-0 ${disabledAll ? 'opacity-40 cursor-not-allowed' : ''}`}
          title={publicUrl}
        >
          <span className="inline-flex items-center gap-1.5">
            {copied ? (
              <FaClipboardCheck className="text-emerald-500" />
            ) : (
              <FaCopy className="text-primary-500" />
            )}
            <span>{copied ? 'Đã copy link nhập liệu!' : 'Copy link nhập liệu'}</span>
          </span>
        </button>
        <button
          onClick={handleCopyInfo}
          disabled={disabledAll || students.length === 0}
          className={`btn-secondary text-sm shrink-0 ${disabledAll || students.length === 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          <span className="inline-flex items-center gap-1.5">
            {copiedInfo ? (
              <FaClipboardCheck className="text-emerald-500" />
            ) : (
              <FaCopy className="text-primary-500" />
            )}
            <span>{copiedInfo ? 'Đã copy thông tin gửi đồ!' : 'Copy thông tin gửi đồ'}</span>
          </span>
        </button>
        <button
          onClick={handleExportExcel}
          disabled={disabledAll || students.length === 0}
          className={`btn-secondary text-sm shrink-0 ${disabledAll || students.length === 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          <span className="inline-flex items-center gap-1.5">
            <FaCalendarAlt className="text-green-500" />
            <span>Xuất Excel</span>
          </span>
        </button>
        <button
          onClick={() => importFileRef.current?.click()}
          disabled={disabledAll}
          className={`btn-secondary text-sm shrink-0 ${disabledAll ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          <span className="inline-flex items-center gap-1.5">
            <FaFileImport className="text-indigo-500" />
            <span>Nhập từ Excel</span>
          </span>
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
      {!selectedCustomer && (
        <div className="card py-16 text-center text-gray-400">
          <div className="text-4xl mb-3 flex justify-center">
            <FaSchool className="text-sky-500" />
          </div>
          <p className="text-base font-medium">Xin mời chọn lớp để xem danh sách học sinh</p>
          <p className="text-sm mt-1">Sau đó bạn có thể copy link để học sinh tự nhập thông tin</p>
        </div>
      )}

      {/* No-schedule warning */}
      {selectedCustomer && noSchedule && (
        <div className="card p-4 mb-4 border-yellow-300 bg-yellow-50 text-yellow-800 text-sm inline-flex items-center gap-2">
          <FiAlertTriangle className="text-yellow-600 shrink-0" />
          <span>
            Lớp này chưa có lịch chụp. Vui lòng tạo lịch chụp trước khi thêm/nhập học sinh hoặc copy
            thông tin.
          </span>
        </div>
      )}

      {/* Student list */}
      {selectedCustomer && (
        <>
          <div className="flex items-center justify-between mb-3 gap-2">
            <p className="text-sm text-gray-500 space-y-1">
              <p className="text-green-600 font-medium">
                Tổng cộng có {selectedCustomer?.total} học sinh đăng ký
              </p>
              {/* Lớp <span className="font-semibold text-gray-800">{selectedCustomer?.className}</span> */}
              <p>
                {' '}
                {students.length} học sinh đã điền thông tin -{' '}
                <span className="text-gray-600">
                  (<span className="text-blue-600 font-medium">Nam: {totalMale}</span>
                  {' / '}
                  <span className="text-pink-600 font-medium">Nữ: {totalFemale}</span>)
                </span>
              </p>
              <p>
                {duplicateNorms.size > 0 && (
                  <span className="text-yellow-600 font-medium inline-flex items-center gap-1">
                    <FiAlertTriangle className="text-yellow-600" />
                    {[...duplicateNorms].reduce(
                      (acc, norm) =>
                        acc + students.filter((s) => normalizeName(s.name) === norm).length,
                      0,
                    )}{' '}
                    trùng tên
                  </span>
                )}
              </p>
            </p>
            <div className="flex  sm:flex-row flex-col-reverse items-center gap-2">
              {duplicateNorms.size > 0 && (
                <button
                  onClick={() => setShowDupOnly((v) => !v)}
                  className={`text-sm px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                    showDupOnly
                      ? 'bg-yellow-100 border-yellow-400 text-yellow-800'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-yellow-50 hover:border-yellow-300'
                  }`}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <FiAlertTriangle className="text-yellow-600" />
                    <span>{showDupOnly ? 'Hiện tất cả' : 'Chỉ hiện trùng'}</span>
                  </span>
                </button>
              )}
              <button
                onClick={openCreate}
                disabled={noSchedule}
                className={`btn-primary text-sm whitespace-nowrap shrink-0 ${noSchedule ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                Thêm học sinh
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
              const studentColumns: Column<StudentResponse>[] = [
                {
                  key: 'index',
                  header: '#',
                  render: (_s, i) => i + 1,
                },
                {
                  key: 'name',
                  header: 'Họ tên',
                  className: 'font-medium',
                  render: (s) => {
                    const isDup = duplicateNorms.has(normalizeName(s.name));
                    return (
                      <>
                        {s.name}
                        {isDup && (
                          <span className="ml-1.5 text-yellow-600 text-xs inline-flex items-center gap-1">
                            <FiAlertTriangle className="text-yellow-600" />
                            <span>trùng tên</span>
                          </span>
                        )}
                      </>
                    );
                  },
                },
                {
                  key: 'gender',
                  header: 'Giới tính',
                  render: (s) => GENDER_LABEL[s.gender],
                },
                {
                  key: 'height',
                  header: 'Chiều cao (cm)',
                  align: 'right',
                  render: (s) => s.height ?? '—',
                },
                {
                  key: 'weight',
                  header: 'Cân nặng (kg)',
                  align: 'right',
                  render: (s) => s.weight ?? '—',
                },
                {
                  key: 'costumes',
                  header: 'Trang phục',
                  render: (s) =>
                    s.costumes?.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {s.costumes.map((c) => (
                          <span key={c._id} className="theme-chip">
                            {c.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="theme-text-muted">—</span>
                    ),
                },
                {
                  key: 'notes',
                  header: 'Ghi chú',
                  className: 'text-xs',
                  render: (s) => s.notes,
                },
                {
                  key: 'actions',
                  header: '',
                  align: 'right',
                  render: (s) => (
                    <span className="space-x-2">
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
                <>
                  {/* Desktop table */}
                  <div className="hidden md:block">
                    <DataTable<StudentResponse>
                      data={displayedStudents}
                      keyExtractor={(s) => s._id}
                      columns={studentColumns}
                      onRowClick={(r) => openEdit(r)}
                      rowStyle={(s) =>
                        duplicateNorms.has(normalizeName(s.name))
                          ? {
                              background: 'var(--table-row-warning-bg)',
                              boxShadow: 'inset 2px 0 0 rgba(245, 158, 11, 0.95)',
                            }
                          : undefined
                      }
                      emptyTitle={
                        showDupOnly ? 'Không còn học sinh trùng tên' : 'Chưa có học sinh nào'
                      }
                      emptyDescription={
                        showDupOnly ? 'Bỏ lọc để xem toàn bộ danh sách.' : undefined
                      }
                      emptyIcon={<FaGraduationCap className="text-primary-500" />}
                    />
                    {showDupOnly && displayedStudents.length === 0 && (
                      <div className="text-center mt-2">
                        <button
                          className="underline text-blue-500 text-sm"
                          onClick={() => setShowDupOnly(false)}
                        >
                          Hiện tất cả
                        </button>
                      </div>
                    )}
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
                                <span className="ml-1.5 text-yellow-600 text-xs inline-flex items-center gap-1">
                                  <FiAlertTriangle className="text-yellow-600" />
                                  <span>trùng tên</span>
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-4 text-sm text-gray-600 mt-1">
                            {s.height && (
                              <span className="inline-flex items-center gap-1.5">
                                <FaRulerVertical className="text-sky-500" />
                                <span>{s.height} cm</span>
                              </span>
                            )}
                            {s.weight && (
                              <span className="inline-flex items-center gap-1.5">
                                <FaWeight className="text-amber-500" />
                                <span>{s.weight} kg</span>
                              </span>
                            )}
                          </div>
                          {s.costumes?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {s.costumes.map((c) => (
                                <span key={c._id} className="theme-chip">
                                  {c.name}
                                </span>
                              ))}
                            </div>
                          )}
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
            <DataTable<ImportRow>
              variant="plain"
              textSize="xs"
              dense
              stickyHeader
              data={importRows}
              keyExtractor={(_r, i) => String(i)}
              rowClassName={(r) =>
                r.error ? 'bg-red-50 text-red-400' : r.warning ? 'bg-yellow-50' : 'hover:bg-gray-50'
              }
              columns={[
                {
                  key: 'index',
                  header: '#',
                  className: 'text-gray-400',
                  render: (_r, i) => i + 1,
                },
                {
                  key: 'name',
                  header: 'Họ tên',
                  className: 'font-medium',
                  render: (r) => r.name || <span className="italic">trống</span>,
                },
                {
                  key: 'gender',
                  header: 'Giới tính',
                  render: (r) => GENDER_LABEL[r.gender] ?? r.gender,
                },
                {
                  key: 'height',
                  header: 'Cao (cm)',
                  align: 'right',
                  render: (r) => r.height ?? '—',
                },
                {
                  key: 'weight',
                  header: 'Nặng (kg)',
                  align: 'right',
                  render: (r) => r.weight ?? '—',
                },
                {
                  key: 'notes',
                  header: 'Ghi chú',
                  className: 'text-gray-400',
                  render: (r) => (
                    <>
                      {r.notes ?? ''}
                      {r.error && <span className="text-red-500 ml-1">({r.error})</span>}
                      {r.warning && (
                        <span className="text-yellow-600 ml-1 inline-flex items-center gap-1">
                          <FiAlertTriangle className="text-yellow-600" />
                          <span>{r.warning}</span>
                        </span>
                      )}
                    </>
                  ),
                },
              ]}
            />
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
              <label className="label">
                Họ tên <span className="text-red-500">*</span>
              </label>
              <input {...register('name', { required: true })} className="input" />
            </div>
            <div>
              <label className="label">
                Giới tính <span className="text-red-500">*</span>
              </label>
              <Controller
                name="gender"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <Select
                    options={[
                      { value: 'male', label: 'Nam' },
                      { value: 'female', label: 'Nữ' },
                    ]}
                    value={field.value ?? ''}
                    onChange={(v) => field.onChange(v)}
                  />
                )}
              />
            </div>
            <div>
              <label className="label">
                Chiều cao (cm) <span className="text-red-500">*</span>
              </label>
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
              <label className="label">
                Cân nặng (kg) <span className="text-red-500">*</span>
              </label>
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
              <label className="label">Trang phục</label>
              {visibleCostumes.length === 0 ? (
                <p className="text-xs theme-text-muted">
                  {scheduleCostumes.length === 0
                    ? 'Lịch chụp này chưa cấu hình trang phục.'
                    : 'Không có trang phục phù hợp với giới tính đã chọn.'}
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {visibleCostumes.map((c) => (
                    <label key={c._id} className="costume-option">
                      <input type="checkbox" value={c._id} {...register('costumes')} />
                      <span className="text-sm">{c.name}</span>
                    </label>
                  ))}
                </div>
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
