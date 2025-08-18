import { Moon, Sun } from "lucide-react"
import { useTheme } from "./theme-provider"

interface HeaderProps {
  className?: string
}

export function Header({ className }: HeaderProps) {
  const { theme, setTheme } = useTheme()
  const darkMode = theme === 'dark'

  const toggleTheme = () => {
    setTheme(darkMode ? 'light' : 'dark')
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
