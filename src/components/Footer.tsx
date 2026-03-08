import React from 'react';

export function Footer() {
  return (
    <footer className="bg-base-200/50 border-base-300 mt-auto border-t py-4 text-center sm:py-6">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-base-content/80 text-sm leading-relaxed">
          SpokeToWork &copy; {new Date().getFullYear()}
        </p>
        <p className="text-base-content/85 mt-1 text-xs">
          Open source template available at{' '}
          <a
            href="https://scripthammer.com"
            target="_blank"
            rel="noopener noreferrer"
            className="link-hover link"
          >
            ScriptHammer.com
          </a>
        </p>
      </div>
    </footer>
  );
}
