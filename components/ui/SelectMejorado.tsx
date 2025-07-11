'use client'

import React, { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

export interface SelectOption {
  value: string
  label: string
  searchText?: string
}

interface SelectMejoradoProps {
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  label?: string
  placeholder?: string
  searchable?: boolean
  className?: string
  error?: string
  required?: boolean
  disabled?: boolean
}

export default function SelectMejorado({
  options,
  value,
  onChange,
  label,
  placeholder = 'Seleccionar...',
  searchable = false,
  className = '',
  error,
  required = false,
  disabled = false
}: SelectMejoradoProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedOption = options.find(opt => opt.value === value)

  const filteredOptions = searchable
    ? options.filter(option => {
        const searchText = option.searchText || option.label
        return searchText.toLowerCase().includes(searchTerm.toLowerCase())
      })
    : options

  const handleSelect = (option: SelectOption) => {
    onChange(option.value)
    setIsOpen(false)
    setSearchTerm('')
  }

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div
        className={`relative border rounded-md ${
          error ? 'border-red-500' : 'border-gray-300'
        } ${disabled ? 'bg-gray-100' : 'bg-white'}`}
      >
        {searchable && isOpen ? (
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 rounded-md focus:outline-none"
            placeholder="Buscar..."
            autoFocus
          />
        ) : (
          <div
            className={`w-full px-3 py-2 rounded-md cursor-pointer ${
              disabled ? 'cursor-not-allowed' : ''
            }`}
            onClick={() => !disabled && setIsOpen(!isOpen)}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </div>
        )}

        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <svg
            className={`h-5 w-5 text-gray-400 transform transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>

      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}

      {isOpen && !disabled && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <div
                key={option.value}
                className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${
                  option.value === value ? 'bg-gray-50' : ''
                }`}
                onClick={() => handleSelect(option)}
              >
                {option.label}
              </div>
            ))
          ) : (
            <div className="px-3 py-2 text-gray-500">No hay resultados</div>
          )}
        </div>
      )}
    </div>
  )
} 
 
 