import { ThemeToggle } from "@/components/ui/theme-toggle";

const MagazineHeader = () => {
  const appName = import.meta.env.VITE_APP_NAME || "Pablo's Magazine";
  
  return (
    <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-orange-100 dark:border-gray-700 shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="rss-icon">
              <svg 
                className="h-8 w-8 text-orange-500" 
                fill="currentColor" 
                viewBox="0 0 24 24"
              >
                <path d="M6.503 20.752c0 1.794-1.456 3.248-3.251 3.248S0 22.546 0 20.752s1.456-3.248 3.252-3.248 3.251 1.454 3.251 3.248zM1.677 6.082v4.15c6.988 0 12.65 5.662 12.65 12.65h4.15c0-9.271-7.529-16.8-16.8-16.8zM1.677.014v4.151C14.236 4.165 24.322 14.251 24.336 26.81H28.487C28.473 12.32 16.168.009 1.677.014z"/>
              </svg>
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100 leading-tight">
                {appName}
              </h1>
              <span className="text-xs text-orange-600 dark:text-orange-400 font-medium hidden sm:block">
                RSS Feed Magazine
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            
            {/* Mobile menu button */}
            <button className="md:hidden p-2 text-gray-600 hover:text-orange-600 dark:text-gray-300 dark:hover:text-orange-400">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default MagazineHeader;