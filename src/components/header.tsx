import { Moon, Sun } from "lucide-react"
import * as React from "react"

interface HeaderProps {
  className?: string
}

export function Header({ className }: HeaderProps) {
  const [darkMode, setDarkMode] = React.useState(false)
  
  React.useEffect(() => {
    // Check for dark mode preference at the root level
    const root = document.documentElement
    const isDark = root.classList.contains('dark')
    setDarkMode(isDark)
  }, [])

  const toggleTheme = () => {
    const root = document.documentElement
    const isDark = !root.classList.contains('dark')
    
    // Toggle dark class on root element
    if (isDark) {
      root.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      root.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
    
    setDarkMode(isDark)
  }
  
  return (
    <header className={`sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:gap-x-6 sm:px-6 lg:px-8 ${className || ''}`}>
      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <div className="flex-1"></div>
        <div className="flex items-center gap-x-4 lg:gap-x-6">
          <button
            type="button"
            className="rounded-full p-1 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
            onClick={toggleTheme}
          >
            <span className="sr-only">Toggle theme</span>
            {darkMode ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </header>
  )
}
