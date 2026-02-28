'use client';

import React, { memo, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayeredSpokeToWorkLogo } from '@/components/atomic/SpinningLogo';
import { ColorblindToggle } from '@/components/molecular/ColorblindToggle';
import { FontSizeControl } from '@/components/navigation/FontSizeControl';
import { detectedConfig } from '@/config/project-detected';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import AvatarDisplay from '@/components/atomic/AvatarDisplay';
import { useUnreadCount } from '@/hooks/useUnreadCount';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function GlobalNavComponent() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { profile } = useUserProfile();
  const unreadCount = useUnreadCount();
  const [theme, setTheme] = useState<string>('');
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  // Theme management — read current theme from DOM (ThemeScript sets it on first paint)
  useEffect(() => {
    const currentTheme =
      document.documentElement.getAttribute('data-theme') ||
      localStorage.getItem('theme') ||
      sessionStorage.getItem('theme') ||
      'spoketowork-dark';
    setTheme(currentTheme);

    // Listen for theme changes from ThemeSwitcher
    const handleExternalThemeChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.theme) {
        setTheme(detail.theme);
      }
    };
    window.addEventListener('themechange', handleExternalThemeChange);
    return () =>
      window.removeEventListener('themechange', handleExternalThemeChange);
  }, []);

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);

    // Apply to DOM
    document.documentElement.setAttribute('data-theme', newTheme);
    if (document.body) {
      document.body.setAttribute('data-theme', newTheme);
    }

    // Persist to both storages for cross-component consistency
    try {
      localStorage.setItem('theme', newTheme);
    } catch {
      // localStorage may be blocked by cookie consent
    }
    sessionStorage.setItem('theme', newTheme);

    // Dispatch custom event for other components to listen to
    window.dispatchEvent(
      new CustomEvent('themechange', {
        detail: { theme: newTheme },
      })
    );
  };

  // PWA installation
  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallButton(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallButton(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      );
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setShowInstallButton(false);
    }
    setDeferredPrompt(null);
  };

  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/blog', label: 'Blog' },
    { href: '/docs', label: 'Docs' },
  ];

  const themes = [
    'spoketowork-dark',
    'spoketowork-light',
    'light',
    'dark',
    'cupcake',
    'bumblebee',
    'emerald',
    'corporate',
    'synthwave',
    'retro',
    'cyberpunk',
    'valentine',
    'halloween',
    'garden',
    'forest',
    'aqua',
    'lofi',
    'pastel',
    'fantasy',
    'wireframe',
    'black',
    'luxury',
    'dracula',
    'cmyk',
    'autumn',
    'business',
    'acid',
    'lemonade',
    'night',
    'coffee',
    'winter',
    'dim',
    'nord',
    'sunset',
  ];

  return (
    <nav
      aria-label="Site navigation"
      className="border-base-300 bg-base-100/95 sticky top-0 z-50 w-full max-w-full border-b shadow-sm backdrop-blur-md"
    >
      <div className="container mx-auto max-w-full px-4">
        <div className="flex h-16 w-full max-w-full items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 transition-opacity hover:opacity-80"
            >
              <div className="h-8 w-8">
                <LayeredSpokeToWorkLogo
                  size={32}
                  speed="slow"
                  className="drop-shadow-sm"
                />
              </div>
              <span className="hidden text-xl font-bold sm:block">
                {detectedConfig.projectName}
              </span>
            </Link>
          </div>

          {/* Main Navigation */}
          <nav
            aria-label="Primary links"
            className="hidden items-center gap-1 md:flex"
          >
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`btn btn-ghost btn-sm ${
                  pathname === item.href ||
                  (pathname?.startsWith(item.href + '/') && item.href !== '/')
                    ? 'btn-active'
                    : ''
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right Section: Auth, Theme & PWA - Mobile-first spacing (PRP-017 T025) */}
          {/* gap-2 (8px) required for WCAG touch target spacing */}
          <div className="flex min-w-0 flex-shrink items-center gap-2">
            {/* Employer Dashboard Icon (employer role only) */}
            {user && profile?.role === 'employer' && (
              <Link
                href="/employer"
                className={`btn btn-ghost btn-circle min-h-11 min-w-11 ${
                  pathname === '/employer' ? 'btn-active' : ''
                }`}
                title="Employer Dashboard"
                aria-label="Employer Dashboard"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </Link>
            )}

            {/* Companies Icon (authenticated users only) */}
            {user && (
              <Link
                href="/companies"
                className={`btn btn-ghost btn-circle min-h-11 min-w-11 ${
                  pathname === '/companies' ? 'btn-active' : ''
                }`}
                title="Companies"
                aria-label="Companies"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </Link>
            )}

            {/* Messages Icon (authenticated users only) */}
            {user && (
              <Link
                href="/messages"
                className="btn btn-ghost btn-circle indicator min-h-11 min-w-11"
                title="Messages"
                aria-label="Messages"
              >
                {unreadCount > 0 && (
                  <span className="indicator-item badge badge-primary badge-sm">
                    {unreadCount}
                  </span>
                )}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
              </Link>
            )}

            {/* Auth Buttons */}
            {user ? (
              <div className="dropdown dropdown-end">
                <button
                  tabIndex={0}
                  className="btn btn-ghost btn-circle avatar min-h-11 min-w-11"
                  aria-label="User account menu"
                >
                  <AvatarDisplay
                    avatarUrl={
                      profile?.avatar_url ||
                      (user.user_metadata?.avatar_url as string) ||
                      null
                    }
                    displayName={profile?.display_name || user.email || 'User'}
                    size="sm"
                  />
                </button>
                <ul
                  tabIndex={0}
                  className="menu menu-sm dropdown-content bg-base-100 rounded-box -right-2 z-[1] mt-3 w-48 max-w-[calc(100vw-4rem)] p-2 shadow sm:w-52"
                >
                  <li className="menu-title">
                    <span>{user.email}</span>
                  </li>
                  {profile?.role === 'employer' && (
                    <li>
                      <Link href="/employer">Employer Dashboard</Link>
                    </li>
                  )}
                  <li>
                    <Link href="/profile">Profile</Link>
                  </li>
                  <li>
                    <Link href="/account">Account Settings</Link>
                  </li>
                  <li>
                    <Link href="/companies">Companies</Link>
                  </li>
                  <li>
                    <Link
                      href="/messages"
                      className="flex items-center justify-between"
                    >
                      <span>Messages</span>
                      {unreadCount > 0 && (
                        <span className="badge badge-primary badge-sm">
                          {unreadCount}
                        </span>
                      )}
                    </Link>
                  </li>
                  <li>
                    <Link href="/messages?tab=connections">Connections</Link>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        // Close dropdown
                        if (document.activeElement instanceof HTMLElement) {
                          document.activeElement.blur();
                        }
                        // Sign out and redirect
                        signOut().then(() => {
                          window.location.href = '/';
                        });
                      }}
                    >
                      Sign Out
                    </button>
                  </li>
                </ul>
              </div>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="btn btn-ghost btn-sm min-h-11 min-w-11"
                >
                  Sign In
                </Link>
                <Link
                  href="/sign-up"
                  className="btn btn-primary btn-sm min-h-11 min-w-11"
                >
                  Sign Up
                </Link>
              </>
            )}

            {/* Mobile Menu - 44px touch target */}
            <div className="dropdown dropdown-end md:hidden">
              <button
                tabIndex={0}
                className="btn btn-ghost btn-circle min-h-11 min-w-11"
                aria-label="Navigation menu"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
              <ul
                tabIndex={0}
                className="menu menu-sm dropdown-content bg-base-100 rounded-box -right-2 z-[1] mt-3 w-40 max-w-[calc(100vw-4rem)] p-2 shadow sm:w-44"
              >
                {navItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={pathname === item.href ? 'active' : ''}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
                {user ? (
                  <>
                    <li className="menu-title mt-2">
                      <span>Account</span>
                    </li>
                    {profile?.role === 'employer' && (
                      <li>
                        <Link href="/employer">Dashboard</Link>
                      </li>
                    )}
                    <li>
                      <Link href="/profile">Profile</Link>
                    </li>
                    <li>
                      <Link href="/account">Settings</Link>
                    </li>
                    <li>
                      <Link href="/companies">Companies</Link>
                    </li>
                    <li>
                      <Link
                        href="/messages"
                        className="flex items-center justify-between"
                      >
                        <span>Messages</span>
                        {unreadCount > 0 && (
                          <span className="badge badge-primary badge-sm">
                            {unreadCount}
                          </span>
                        )}
                      </Link>
                    </li>
                    <li>
                      <Link href="/messages?tab=connections">Connections</Link>
                    </li>
                    <li>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          // Close dropdown
                          if (document.activeElement instanceof HTMLElement) {
                            document.activeElement.blur();
                          }
                          // Sign out and redirect
                          signOut().then(() => {
                            window.location.href = '/';
                          });
                        }}
                      >
                        Sign Out
                      </button>
                    </li>
                  </>
                ) : (
                  <>
                    <li className="menu-title mt-2">
                      <span>Account</span>
                    </li>
                    <li>
                      <Link href="/sign-in">Sign In</Link>
                    </li>
                    <li>
                      <Link href="/sign-up">Sign Up</Link>
                    </li>
                  </>
                )}
              </ul>
            </div>

            {/* PWA Install Button */}
            {showInstallButton && !isInstalled && (
              <button
                onClick={handleInstallClick}
                className="btn btn-primary btn-sm min-h-11 min-w-11"
                title="Progressive Web App (PWA) - Install this app for offline access and better performance"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  className="h-4 w-4 stroke-current"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                <span className="hidden lg:inline">Install App</span>
              </button>
            )}

            {/* Font Size Control */}
            <FontSizeControl />

            {/* Color Vision Control */}
            <ColorblindToggle className="compact" />

            {/* Theme Selector - Mobile-first touch targets */}
            <div className="dropdown dropdown-end">
              <button
                tabIndex={0}
                className="btn btn-ghost btn-circle min-h-11 min-w-11"
                title="Change theme"
                aria-label="Change theme"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 sm:h-5 sm:w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                  />
                </svg>
              </button>
              <ul
                tabIndex={0}
                className="dropdown-content bg-base-100 rounded-box z-[1] max-h-96 w-44 max-w-[calc(100vw-4rem)] overflow-y-auto p-2 shadow-lg sm:w-52"
              >
                {themes.map((t) => (
                  <li key={t}>
                    <button
                      className={`btn btn-ghost btn-sm w-full justify-start ${theme === t ? 'btn-active' : ''}`}
                      onClick={() => handleThemeChange(t)}
                    >
                      <span className="capitalize">{t}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

export const GlobalNav = memo(GlobalNavComponent);
