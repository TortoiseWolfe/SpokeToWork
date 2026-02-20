'use client';

import { useEffect } from 'react';
import HeroSection from '@/components/organisms/HeroSection';
import FeaturesSection from '@/components/organisms/FeaturesSection';
import HowItWorksSection from '@/components/organisms/HowItWorksSection';
import CTAFooter from '@/components/organisms/CTAFooter';

export default function Home() {
  useEffect(() => {
    const handleResize = () => {
      document.body.style.overflow = window.innerWidth < 768 ? '' : 'hidden';
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="from-base-200 via-base-100 to-base-200 flex min-h-[calc(100vh-10rem)] flex-col overflow-x-hidden overflow-y-auto bg-gradient-to-br">
      <a
        href="#main-content"
        className="btn btn-sm btn-primary sr-only min-h-11 min-w-11 focus:not-sr-only focus:absolute focus:top-4 focus:left-4"
      >
        Skip to main content
      </a>
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <CTAFooter />
    </div>
  );
}
