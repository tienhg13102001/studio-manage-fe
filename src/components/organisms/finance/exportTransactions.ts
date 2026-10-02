import { transactionService } from '../../../services/transactionService';
import type { TransactionResponse } from '../../../types';
import { getSchoolName } from '../../../types';
import { formatDate } from '../../../utils/format';

/** Fetches every transaction matching `params` (all pages) and downloads them as .xlsx. */
export const exportTransactions = async (
  params: Record<string, string | number>,
  fileName: string,
) => {
  const rows: TransactionResponse[] = [];
  const limit = 200;
  for (let p = 1; ; p += 1) {
    const res = await transactionService.getAll({ ...params, page: p, limit });
    rows.push(...res.data);
    if (res.data.length < limit || rows.length >= res.total) break;
  }

  const { default: ExcelJS } = await import('exceljs');
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Thu chi');
  ws.columns = [
    { width: 6 },
    { width: 12 },
    { width: 8 },
    { width: 22 },
    { width: 12 },
    { width: 28 },
    { width: 40 },
    { width: 20 },
    { width: 16 },
    { width: 14 },
  ];
  const border: Partial<import('exceljs').Borders> = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' },
  };
  const headerRow = ws.addRow([
    'STT',
    'Ngày',
    'Loại',
    'Danh mục',
    'Lớp',
    'Trường',
    'Mô tả',
    'Người thực hiện',
    'Số tiền',
    'KT hoàn tiền',
  ]);
  headerRow.font = { bold: true };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
    cell.border = border;
  });
  rows.forEach((t, i) => {
    const income = t.type === 'income';
    const row = ws.addRow([
      i + 1,
      formatDate(t.date),
      income ? 'Thu' : 'Chi',
      t.categoryId?.name ?? '',
      t.customer?.className ?? '',
      getSchoolName(t.customer),
      t.description ?? '',
      t.createdBy?.name ?? t.createdBy?.username ?? '',
      income ? t.amount : -t.amount,
      income ? '' : t.accountantRefunded ? 'Đã hoàn' : 'Chưa hoàn',
    ]);
    row.getCell(9).numFmt = '#,##0';
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = border;
    });
  });

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
