import React from 'react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-t border-gray-200 dark:border-gray-800 mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Developed by <span className="font-medium text-gray-800 dark:text-gray-200">Pablo Murad</span> - {currentYear}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;