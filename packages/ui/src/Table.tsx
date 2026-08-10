import { HTMLAttributes, ReactNode } from "react";

export interface Column<T> {
  header: string;
  render: (row: T) => ReactNode;
  key: string;
}

export interface TableProps<T> extends HTMLAttributes<HTMLTableElement> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyMessage?: string;
}

export function Table<T>({ columns, rows, rowKey, emptyMessage = "No data yet.", className = "", ...rest }: TableProps<T>) {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-500">{emptyMessage}</p>;
  }

  return (
    <table className={`w-full text-left text-sm ${className}`} {...rest}>
      <thead>
        <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
          {columns.map((col) => (
            <th key={col.key} className="px-4 py-2 font-medium">
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {rows.map((row) => (
          <tr key={rowKey(row)} className="hover:bg-slate-50">
            {columns.map((col) => (
              <td key={col.key} className="px-4 py-3 align-top">
                {col.render(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
