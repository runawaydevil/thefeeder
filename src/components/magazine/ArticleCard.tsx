import { Badge } from "@/components/ui/badge";

interface ArticleCardProps {
  title: string;
  excerpt: string;
  author: string;
  publishedDate: string;
  readingTime: string;
  imageUrl?: string;
  category?: string;
  href: string;
}

const ArticleCard = ({
  title,
  excerpt,
  author,
  publishedDate,
  readingTime,
  imageUrl,
  category,
  href,
}: ArticleCardProps) => {
  return (
    <article className="rss-card-bg rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 rss-hover group">
      <a href={href} target="_blank" rel="noopener noreferrer" className="block h-full">
        {imageUrl ? (
          <div className="relative h-48 sm:h-52 overflow-hidden">
            <img
              src={imageUrl}
              alt={title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
            {category && (
              <div className="absolute top-3 left-3">
                <Badge className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
                  {category}
                </Badge>
              </div>
            )}
          </div>
        ) : (
          <div className="relative h-32 sm:h-40 bg-gradient-to-br from-orange-100 to-yellow-100 dark:from-orange-900/30 dark:to-yellow-900/30 flex items-center justify-center">
            <svg className="h-12 w-12 text-orange-300 dark:text-orange-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6.503 20.752c0 1.794-1.456 3.248-3.251 3.248S0 22.546 0 20.752s1.456-3.248 3.252-3.248 3.251 1.454 3.251 3.248zM1.677 6.082v4.15c6.988 0 12.65 5.662 12.65 12.65h4.15c0-9.271-7.529-16.8-16.8-16.8zM1.677.014v4.151C14.236 4.165 24.322 14.251 24.336 26.81H28.487C28.473 12.32 16.168.009 1.677.014z"/>
            </svg>
            {category && (
              <div className="absolute top-3 left-3">
                <Badge className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
                  {category}
                </Badge>
              </div>
            )}
          </div>
        )}
        
        <div className="p-4 sm:p-6 flex flex-col h-full">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100 mb-3 line-clamp-2 group-hover:text-orange-700 dark:group-hover:text-orange-400 transition-colors duration-200">
            {title}
          </h2>
          <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base mb-4 line-clamp-3 flex-grow rss-mobile-text">
            {excerpt}
          </p>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-auto">
            <div className="flex items-center space-x-2">
              <span className="font-medium text-orange-600 dark:text-orange-400">{author}</span>
              <span className="hidden sm:inline">•</span>
              <time className="text-gray-500 dark:text-gray-400">{publishedDate}</time>
            </div>
            <div className="flex items-center space-x-1 text-orange-500 dark:text-orange-400">
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{readingTime}</span>
            </div>
          </div>
        </div>
      </a>
    </article>
  );
};

export default ArticleCard;