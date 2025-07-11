'use client'

import { useState } from 'react'
import { IconSearch, IconFilter, IconX } from '@tabler/icons-react'
import Button from './Button'
import SelectMejorado from './SelectMejorado'

export interface FilterField {
  key: string
  label: string
  type: 'text' | 'select' | 'date' | 'number'
  options?: { value: string; label: string }[]
  placeholder?: string
}

interface SearchFiltersProps {
  searchValue: string
  onSearchChange: (value: string) => void
  filters: FilterField[]
  filterValues: { [key: string]: string }
  onFilterChange: (key: string, value: string) => void
  onClearFilters: () => void
  className?: string
}

export default function SearchFilters({
  searchValue,
  onSearchChange,
  filters,
  filterValues,
  onFilterChange,
  onClearFilters,
  className = ''
}: SearchFiltersProps) {
  const [showFilters, setShowFilters] = useState(false)
  
  const hasActiveFilters = Object.values(filterValues).some(value => value !== '')
  const hasActiveSearch = searchValue !== ''
  const hasAnyActive = hasActiveFilters || hasActiveSearch

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      {/* Barra de búsqueda principal */}
      <div className="flex gap-3 items-center">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <IconSearch className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar..."
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
          />
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className={`${showFilters ? 'bg-gray-100' : ''} ${hasActiveFilters ? 'border-blue-300 text-blue-700' : ''}`}
        >
          <IconFilter className="h-4 w-4 mr-2" />
          Filtros
          {hasActiveFilters && (
            <span className="ml-1 bg-blue-100 text-blue-800 text-xs px-1.5 py-0.5 rounded-full">
              {Object.values(filterValues).filter(v => v !== '').length}
            </span>
          )}
        </Button>
        
        {hasAnyActive && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onSearchChange('')
              onClearFilters()
            }}
            className="text-red-600 border-red-300 hover:bg-red-50"
          >
            <IconX className="h-4 w-4 mr-1" />
            Limpiar
          </Button>
        )}
      </div>

      {/* Panel de filtros expandible */}
      {showFilters && filters.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filters.map((filter) => (
              <div key={filter.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {filter.label}
                </label>
                
                {filter.type === 'select' && filter.options ? (
                  <SelectMejorado
                    value={filterValues[filter.key] || ''}
                    onChange={(value) => onFilterChange(filter.key, value)}
                    options={[
                      { value: '', label: `Todos los ${filter.label.toLowerCase()}` },
                      ...filter.options
                    ]}
                    placeholder={filter.placeholder || `Seleccionar ${filter.label.toLowerCase()}`}
                  />
                ) : (
                  <input
                    type={filter.type}
                    value={filterValues[filter.key] || ''}
                    onChange={(e) => onFilterChange(filter.key, e.target.value)}
                    placeholder={filter.placeholder || `Filtrar por ${filter.label.toLowerCase()}`}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-gray-500 text-sm"
                  />
                )}
              </div>
            ))}
          </div>
          
          {hasActiveFilters && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-gray-500">Filtros activos:</span>
                {Object.entries(filterValues).map(([key, value]) => {
                  if (!value) return null
                  const filter = filters.find(f => f.key === key)
                  if (!filter) return null
                  
                  let displayValue = value
                  if (filter.type === 'select' && filter.options) {
                    const option = filter.options.find(o => o.value === value)
                    displayValue = option?.label || value
                  }
                  
                  return (
                    <span
                      key={key}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                    >
                      {filter.label}: {displayValue}
                      <button
                        onClick={() => onFilterChange(key, '')}
                        className="hover:bg-blue-200 rounded-full p-0.5"
                      >
                        <IconX className="h-3 w-3" />
                      </button>
                    </span>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
} 