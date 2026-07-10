import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border bg-surface/60">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-4 px-6 py-6 text-center text-xs text-text-secondary sm:flex-row sm:justify-between sm:text-left lg:px-10">
        <p>
          © {year} US Miles Club · Built for counties and states moving together.
        </p>
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2" aria-label="Footer">
          <Link to="/about" className="transition-colors hover:text-foreground">
            About
          </Link>
          <Link to="/privacy" className="transition-colors hover:text-foreground">
            Privacy
          </Link>
          <Link to="/contact" className="transition-colors hover:text-foreground">
            Contact
          </Link>
        </nav>
      </div>
    </footer>
  );
}
