import { useRef, useState } from 'react';
import ExcelJS from 'exceljs';
import { toast } from 'react-toastify';
import { studentService } from '../services/studentService';
import type { Student, StudentResponse } from '../types';

export interface ImportRow {
  name: string;
  gender: 'male' | 'female';
  height?: number;
  weight?: number;
  notes?: string;
  /** Hard error — row will be skipped on import */
  error?: string;
  /** Soft warning — duplicate candidate, user can still import */
  warning?: string;
}

const GENDER_FROM_LABEL: Record<string, string> = {
  nam: 'male',
  nữ: 'female',
  male: 'male',
  female: 'female',
};

const normalizeName = (name: string) => name.toLowerCase().trim().replace(/\s+/g, ' ');

interface UseExcelImportOptions {
  selectedId: string;
  existingStudents: Student[];
  /** Called for each student successfully imported (optimistic update) */
  onStudentAdded: (student: StudentResponse) => void;
}

/**
 * Encapsulates Excel-file parsing, duplicate detection, and sequential import with progress.
 * Used by CustomerSizePage.
 */
export function useExcelImport({
  selectedId,
  existingStudents,
  onStudentAdded,
}: UseExcelImportOptions) {
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [showDupOnly, setShowDupOnly] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);

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

      // Locate header row by detecting "stt" / "họ tên"
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
        const parsedHeight =
          height !== undefined && !isNaN(height) && height > 0 ? height : undefined;
        const parsedWeight =
          weight !== undefined && !isNaN(weight) && weight > 0 ? weight : undefined;
        const notes = row.getCell(6).value ? String(row.getCell(6).value).trim() : undefined;

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

      // Duplicate detection against existing students and within the file
      const existingByNorm = new Map(existingStudents.map((s) => [normalizeName(s.name), s.name]));
      const seenInFile = new Map<string, number>();

      rows.forEach((r, i) => {
        const norm = normalizeName(r.name);
        if (existingByNorm.has(norm)) {
          r.warning = `Trùng với "${existingByNorm.get(norm)!}" đã có trong lớp`;
        } else if (seenInFile.has(norm)) {
          const firstIdx = seenInFile.get(norm)!;
          r.warning = `Có thể trùng với dòng ${firstIdx + 1}`;
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
        const created = await studentService.create({ ...valid[i], customer: selectedId });
        onStudentAdded(created);
        success++;
      } catch {
        // continue on individual row failure
      }
      setImportProgress(Math.round(((i + 1) / valid.length) * 100));
    }

    setImporting(false);
    setImportModalOpen(false);
    setImportRows([]);
    toast.success(`Đã import ${success}/${valid.length} học sinh.`);
  };

  const closeImportModal = () => {
    if (!importing) {
      setImportModalOpen(false);
      setImportRows([]);
    }
  };

  return {
    importRows,
    importModalOpen,
    importing,
    importProgress,
    showDupOnly,
    setShowDupOnly,
    importFileRef,
    handleImportFileChange,
    handleConfirmImport,
    closeImportModal,
  };
}
