import React, { createContext, useContext, useState, useCallback } from 'react'

const STORAGE_KEY = 'sidebarCollapsed'

interface SidebarContextValue {
  collapsed: boolean
  toggle: () => void
}

const SidebarContext = createContext<SidebarContextValue>({ collapsed: true, toggle: () => {} })

export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === null ? true : stored === 'true'
  })

  const toggle = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev
      localStorage.setItem(STORAGE_KEY, String(next))
      return next
    })
  }, [])

  return (
    <SidebarContext.Provider value={{ collapsed, toggle }}>
      {children}
    </SidebarContext.Provider>
  )
}

export const useSidebar = () => useContext(SidebarContext)

export const SIDEBAR_WIDTH_COLLAPSED = 60
export const SIDEBAR_WIDTH_EXPANDED = 200
