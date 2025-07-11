import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface TableColumn<T> {
  key: keyof T | string
  header: string
  render?: (item: T) => ReactNode
  className?: string
  width?: string
}

export interface TableProps<T> {
  data: T[]
  columns: TableColumn<T>[]
  keyField: keyof T
  className?: string
  emptyMessage?: string
  loading?: boolean
}

export default function Table<T extends Record<string, any>>({
  data,
  columns,
  keyField,
  className,
  emptyMessage = "No hay datos para mostrar",
  loading = false
}: TableProps<T>) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-600"></div>
        <span className="ml-2 text-gray-600">Cargando...</span>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className={cn("table-container", className)}>
      <table className="table-modern">
        <thead>
          <tr>
            {columns.map((column, index) => (
              <th
                key={index}
                className={cn(column.className)}
                style={column.width ? { width: column.width } : undefined}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={String(item[keyField])} className="table-row">
              {columns.map((column, index) => (
                <td
                  key={index}
                  className={cn(column.className)}
                >
                  {column.render
                    ? column.render(item)
                    : String(item[column.key as keyof T] || '-')
                  }
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
} 