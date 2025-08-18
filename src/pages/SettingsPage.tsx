export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:truncate sm:text-3xl sm:tracking-tight">
          Settings
        </h2>
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow dark:bg-gray-800">
        <div className="p-6">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">API Configuration</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Configure your API endpoints and connection settings.
              </p>
            </div>

            <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
              <div className="space-y-4">
                <div>
                  <label htmlFor="api-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    API Base URL
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="api-url"
                      id="api-url"
                      defaultValue="http://localhost:3000"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="api-key" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    API Key (optional)
                  </label>
                  <div className="mt-1">
                    <input
                      type="password"
                      name="api-key"
                      id="api-key"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-6">
              <button
                type="button"
                className="ml-3 inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
