import MagazineHeader from "@/components/magazine/MagazineHeader";
import MagazineGrid from "@/components/magazine/MagazineGrid";

const Index = () => {
  const appName = import.meta.env.VITE_APP_NAME || "Pablo's Magazine";
  
  return (
    <div className="min-h-screen rss-gradient-bg dark:bg-gray-900">
      <MagazineHeader />
      
      {/* Hero Section */}
      <section className="pt-16 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto text-center">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full rss-gold-bg mb-6 rss-icon">
              <svg 
                className="h-12 w-12 text-white" 
                fill="currentColor" 
                viewBox="0 0 24 24"
              >
                <path d="M6.503 20.752c0 1.794-1.456 3.248-3.251 3.248S0 22.546 0 20.752s1.456-3.248 3.252-3.248 3.251 1.454 3.251 3.248zM1.677 6.082v4.15c6.988 0 12.65 5.662 12.65 12.65h4.15c0-9.271-7.529-16.8-16.8-16.8zM1.677.014v4.151C14.236 4.165 24.322 14.251 24.336 26.81H28.487C28.473 12.32 16.168.009 1.677.014z"/>
              </svg>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-800 dark:text-gray-100 mb-4">
              {appName}
            </h1>
          </div>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-4xl mx-auto leading-relaxed rss-mobile-text">
            Welcome to my collection of news and articles. This magazine 
            automatically fetches content from my FreshRSS feed to 
            share the latest news and insights I'm following.
          </p>
          
          {/* RSS Badge */}
          <div className="mt-8 inline-flex items-center px-4 py-2 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-sm font-medium">
            <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6.503 20.752c0 1.794-1.456 3.248-3.251 3.248S0 22.546 0 20.752s1.456-3.248 3.252-3.248 3.251 1.454 3.251 3.248zM1.677 6.082v4.15c6.988 0 12.65 5.662 12.65 12.65h4.15c0-9.271-7.529-16.8-16.8-16.8zM1.677.014v4.151C14.236 4.165 24.322 14.251 24.336 26.81H28.487C28.473 12.32 16.168.009 1.677.014z"/>
            </svg>
            Powered by RSS
          </div>
        </div>
      </section>

      <MagazineGrid />

      {/* Footer */}
      <footer className="mt-20 py-12 border-t border-orange-100 bg-white/50 dark:border-gray-700 dark:bg-gray-800/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="text-gray-600 dark:text-gray-400">
            <p>Developed by Pablo Murad - {new Date().getFullYear()}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
