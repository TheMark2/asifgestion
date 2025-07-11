import { useState, useMemo } from 'react'

export interface UseSearchOptions<T> {
  data: T[]
  searchFields: (keyof T)[]
  filterFunctions?: { [key: string]: (item: T, value: string) => boolean }
}

export function useSearch<T>({ data, searchFields, filterFunctions = {} }: UseSearchOptions<T>) {
  const [searchValue, setSearchValue] = useState('')
  const [filterValues, setFilterValues] = useState<{ [key: string]: string }>({})

  const filteredData = useMemo(() => {
    let result = data

    // Aplicar búsqueda de texto
    if (searchValue) {
      const searchLower = searchValue.toLowerCase()
      result = result.filter(item =>
        searchFields.some(field => {
          const value = item[field]
          if (value == null) return false
          return String(value).toLowerCase().includes(searchLower)
        })
      )
    }

    // Aplicar filtros
    Object.entries(filterValues).forEach(([filterKey, filterValue]) => {
      if (filterValue) {
        const filterFunction = filterFunctions[filterKey]
        if (filterFunction) {
          result = result.filter(item => filterFunction(item, filterValue))
        } else {
          // Filtro por defecto - buscar en el campo con el mismo nombre
          result = result.filter(item => {
            const itemValue = (item as any)[filterKey]
            if (itemValue == null) return false
            return String(itemValue).toLowerCase().includes(filterValue.toLowerCase())
          })
        }
      }
    })

    return result
  }, [data, searchValue, filterValues, searchFields, filterFunctions])

  const setFilterValue = (key: string, value: string) => {
    setFilterValues(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const clearFilters = () => {
    setFilterValues({})
  }

  const clearAll = () => {
    setSearchValue('')
    setFilterValues({})
  }

  return {
    searchValue,
    setSearchValue,
    filterValues,
    setFilterValue,
    clearFilters,
    clearAll,
    filteredData,
    resultCount: filteredData.length,
    totalCount: data.length
  }
} 