import React from 'react';

export type DataColumn<Row> = {
  key: string;
  header: React.ReactNode;
  cell: (row: Row) => React.ReactNode;
  rowHeader?: boolean;
};

type DataTableProps<Row> = {
  caption: React.ReactNode;
  columns: readonly DataColumn<Row>[];
  rows: readonly Row[];
  rowKey: (row: Row) => React.Key;
  rowClassName?: (row: Row) => string;
};

export function DataTable<Row>({ caption, columns, rows, rowKey, rowClassName }: DataTableProps<Row>) {
  return (
    <table className="dataTable">
      <caption className="visuallyHidden">{caption}</caption>
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column.key} scope="col">
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr className={rowClassName?.(row)} key={rowKey(row)}>
            {columns.map((column) =>
              column.rowHeader ? (
                <th key={column.key} scope="row">
                  {column.cell(row)}
                </th>
              ) : (
                <td key={column.key}>{column.cell(row)}</td>
              )
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

type DataListItem = {
  label: React.ReactNode;
  value: React.ReactNode;
};

type DataListProps = {
  items: readonly DataListItem[];
  label?: string;
  className?: string;
};

export function DataList({ items, label, className = '' }: DataListProps) {
  return (
    <dl className={`dataList ${className}`.trim()} aria-label={label}>
      {items.map((item, index) => (
        <div key={index}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
