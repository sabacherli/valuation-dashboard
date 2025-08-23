import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Home, LineChart, Settings, Coins } from "lucide-react";

export function Sidebar() {
  const navigation = [
    { name: 'Portfolio', href: '/', icon: Home },
    { name: 'Instruments', href: '/instruments', icon: Coins },
    { name: 'Risk Analysis', href: '/risk', icon: LineChart },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
      <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white px-6 pb-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex h-16 shrink-0 items-center">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Portfolio Dashboard</h1>
        </div>
        <nav className="flex flex-1 flex-col">
          <ul role="list" className="flex flex-1 flex-col gap-y-7">
            <li>
              <ul role="list" className="-mx-2 space-y-1">
                {navigation.map((item) => (
                  <li key={item.name}>
                    <NavLink
                      to={item.href}
                      className={({ isActive }) =>
                        cn(
                          isActive
                            ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white'
                            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white',
                          'group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6'
                        )
                      }
                    >
                      <item.icon
                        className={cn(
                          'h-5 w-5 shrink-0',
                          'text-gray-700 group-hover:text-gray-900 dark:text-gray-300 dark:group-hover:text-white'
                        )}
                        aria-hidden="true"
                      />
                      {item.name}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}
