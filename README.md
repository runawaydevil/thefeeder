# The Feeder

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![SQLite](https://img.shields.io/badge/sqlite-%2307405e.svg?style=for-the-badge&logo=sqlite&logoColor=white)
![RSS](https://img.shields.io/badge/rss-FFA500?style=for-the-badge&logo=rss&logoColor=white)

A modern, responsive RSS magazine that automatically fetches and displays articles from FreshRSS feeds with intelligent feed diversity management and beautiful magazine-style layout.

## ✨ Features

- **🔄 Automatic RSS Synchronization**: Connects to FreshRSS via Fever API for seamless content fetching
- **🎯 Feed Diversity Management**: Intelligent algorithms ensure balanced content from multiple feeds
- **📱 Responsive Design**: Beautiful magazine-style layout that works on all devices
- **🌙 Dark/Light Mode**: Toggle between themes with system preference detection
- **⚡ Performance Optimized**: Smart caching and pagination for fast loading
- **📊 Real-time Metrics**: Monitor feed health and diversity scores
- **🔍 Smart Pagination**: Multiple pagination strategies (balanced, round-robin, weighted)
- **💾 Local Storage**: Client-side database with automatic cleanup
- **🎨 Modern UI**: Clean, magazine-inspired interface with smooth animations
- **🔍 SEO Optimized**: Complete meta tags, Open Graph, and Twitter Cards support
- **📱 Social Media Ready**: Rich previews when shared on Facebook, Twitter, LinkedIn
- **🤖 Search Engine Friendly**: Structured data, sitemap, and robots.txt included

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- FreshRSS instance with Fever API enabled

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/runawaydevil/pablos-rss-magazine.git
   cd pablos-rss-magazine
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your FreshRSS configuration:
   ```env
   # FreshRSS Configuration
   VITE_FRESHRSS_BASE_URL=https://your-freshrss-instance.com
   VITE_FRESHRSS_USER=your-username
   VITE_FRESHRSS_PASSWORD=your-password
   VITE_FRESHRSS_TOKEN=your-fever-api-token
   
   # App Configuration
   VITE_APP_NAME=Your Magazine Name
   VITE_SYNC_INTERVAL_HOURS=2
   
   # SEO Configuration
   VITE_SITE_URL=https://your-domain.com
   VITE_SITE_TITLE=Your Magazine Name - Modern RSS Reader
   VITE_SITE_DESCRIPTION=Your magazine description for SEO and social sharing
   VITE_SITE_KEYWORDS=RSS, news, articles, magazine, your, keywords
   VITE_SITE_AUTHOR=Your Name
   VITE_SITE_IMAGE=https://your-domain.com/og-image.svg
   VITE_TWITTER_HANDLE=@your-twitter
   VITE_FACEBOOK_APP_ID=your-facebook-app-id
   VITE_SITE_LOCALE=en_US
   
   # Development Server
   VITE_DEV_PORT=8693
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Build for production**
   ```bash
   npm run build
   ```

## 🔧 Configuration

### FreshRSS Setup

1. Enable Fever API in your FreshRSS instance
2. Generate an API token in FreshRSS settings
3. Add your credentials to the `.env` file

### Feed Diversity Settings

The application includes advanced feed diversity management with configurable parameters:

```env
# Feed Diversity Configuration
VITE_SYNC_ARTICLE_LIMIT=100
VITE_MAX_ARTICLES_PER_FEED=15
VITE_MIN_FEEDS_REQUIRED=3

# Performance Optimization
VITE_FEED_HEALTH_CACHE_TTL=300000
VITE_MAX_CONCURRENT_STRATEGIES=2
VITE_RETRY_MAX_ATTEMPTS=3
```

## 📦 Deployment

### Static Hosting (Recommended)

The application is a static site that can be deployed to any static hosting service:

**Netlify:**
```bash
npm run build
# Deploy the 'dist' folder to Netlify
```

**Vercel:**
```bash
npm run build
# Deploy the 'dist' folder to Vercel
```

**GitHub Pages:**
```bash
npm run build
# Push the 'dist' folder to gh-pages branch
```

### Docker Deployment

```dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Environment Variables for Production

Make sure to set these environment variables in your hosting platform:

**Required:**
- `VITE_FRESHRSS_BASE_URL`
- `VITE_FRESHRSS_USER`
- `VITE_FRESHRSS_PASSWORD`
- `VITE_FRESHRSS_TOKEN`
- `VITE_APP_NAME`

**SEO & Social Media:**
- `VITE_SITE_URL` - Your domain URL
- `VITE_SITE_TITLE` - Page title for SEO
- `VITE_SITE_DESCRIPTION` - Meta description
- `VITE_SITE_KEYWORDS` - SEO keywords
- `VITE_SITE_AUTHOR` - Author name
- `VITE_SITE_IMAGE` - Social sharing image URL
- `VITE_TWITTER_HANDLE` - Twitter handle for cards
- `VITE_FACEBOOK_APP_ID` - Facebook App ID (optional)
- `VITE_SITE_LOCALE` - Site locale (default: en_US)

## 🏗️ Architecture

### Core Components

- **Feed Diversity Manager**: Orchestrates multiple retrieval strategies
- **Retrieval Engine**: Handles different article fetching strategies
- **Feed Balancer**: Ensures balanced distribution across feeds
- **Diversity Validator**: Validates and scores content diversity
- **Performance Cache**: Optimizes repeated operations
- **Error Manager**: Handles feed failures and recovery

### Data Flow

1. **Initialization**: App starts with empty local database
2. **Auto-Sync**: Automatic synchronization every 2 hours (configurable)
3. **Feed Fetching**: Multiple strategies ensure diverse content
4. **Local Storage**: Articles stored in browser's localStorage
5. **Smart Pagination**: Balanced content display across pages
6. **Health Monitoring**: Continuous feed health assessment

## 🧪 Testing

Run the included test scripts to validate your setup:

```bash
# Test feed diversity components
npm run test:diversity-all

# Test individual components
npm run test:feed-balancer
npm run test:diversity-validator
npm run test:feed-error-manager
```

## 🎨 Customization

### Themes

The application supports custom themes through CSS variables. Edit `src/index.css` to customize:

```css
:root {
  --primary-color: #f97316;
  --secondary-color: #1f2937;
  /* Add your custom colors */
}
```

### Layout

Modify the magazine layout in `src/components/magazine/` directory:
- `MagazineHeader.tsx` - Header and navigation
- `MagazineGrid.tsx` - Article grid and pagination
- `ArticleCard.tsx` - Individual article cards

## 📊 Monitoring

The application includes comprehensive monitoring features:

- **Feed Health Dashboard**: Monitor individual feed status
- **Diversity Metrics**: Track content distribution
- **Performance Analytics**: Cache hit rates and response times
- **Error Tracking**: Detailed error logs and recovery attempts

## 🔍 Troubleshooting

### Common Issues

**No articles appearing:**
- Check FreshRSS credentials in `.env`
- Verify Fever API is enabled
- Check browser console for errors

**Poor feed diversity:**
- Adjust `VITE_MIN_FEEDS_REQUIRED` setting
- Check if feeds are active in FreshRSS
- Review diversity validation logs

**Performance issues:**
- Increase cache TTL values
- Reduce `VITE_SYNC_ARTICLE_LIMIT`
- Check network connectivity to FreshRSS

**SEO/Social Media Issues:**
- Verify `VITE_SITE_URL` matches your domain
- Test social previews with [Facebook Debugger](https://developers.facebook.com/tools/debug/)
- Validate Twitter Cards with [Twitter Card Validator](https://cards-dev.twitter.com/validator)
- Check structured data with [Google Rich Results Test](https://search.google.com/test/rich-results)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Pablo Murad** ([@runawaydevil](https://github.com/runawaydevil))

*Created with ❤️ for the RSS community*

---

## 🙏 Acknowledgments

*In memory of **Aaron Swartz** (1986-2013), whose pioneering work on RSS and commitment to open information helped shape the web as we know it. His vision of free and accessible information continues to inspire developers and activists worldwide. Aaron's legacy in RSS technology and digital rights will never be forgotten.*

---

*September 2025*