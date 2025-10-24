export default function Footer() {
  return (
    <footer className="border-t border-border bg-bg mt-auto">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted">
          <div>
            <p>© 2025 RunawayDevil. Minimalist RSS aggregator.</p>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/runawaydevil/thefeeder"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-accent transition-colors"
            >
              GitHub
            </a>
            <a
              href="/admin/health"
              className="hover:text-accent transition-colors"
            >
              Status
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

