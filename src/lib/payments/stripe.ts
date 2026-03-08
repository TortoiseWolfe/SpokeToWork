/**
 * Stripe Client Wrapper
 * Lazy-loads Stripe.js only after consent granted
 */

import { loadStripe, Stripe } from '@stripe/stripe-js';
import { stripeConfig } from '@/config/payment';

let stripePromise: Promise<Stripe | null> | null = null;

/**
 * Get Stripe instance (lazy loaded)
 * Requires payment consent before loading
 */
export async function getStripe(): Promise<Stripe | null> {
  // Check consent before loading external script
  const hasConsent =
    typeof window !== 'undefined' &&
    localStorage.getItem('payment_consent') === 'granted';

  if (!hasConsent) {
    throw new Error(
      'Payment consent required. Please accept the payment consent modal to use Stripe.'
    );
  }

  // Lazy load Stripe.js (only once)
  if (!stripePromise) {
    stripePromise = loadStripe(stripeConfig.publishableKey);
  }

  return stripePromise;
}

/**
 * Create Stripe Checkout Session
 * Calls Edge Function, then redirects to Stripe Checkout
 *
 * Uses URL-based redirect (modern Stripe API) instead of deprecated redirectToCheckout.
 * Edge Function returns session.url for direct browser redirect.
 */
export async function createCheckoutSession(
  paymentIntentId: string
): Promise<void> {
  // Note: We don't need the Stripe instance for URL-based redirect,
  // but we verify consent is granted
  const stripe = await getStripe();
  if (!stripe) {
    throw new Error('Stripe failed to load');
  }

  // Call Edge Function to create checkout session
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-stripe-checkout`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ payment_intent_id: paymentIntentId }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create checkout session');
  }

  const data = await response.json();

  // Modern approach: Edge Function returns session.url for direct redirect
  // Fallback: Legacy sessionId-based redirect (deprecated)
  if (data.url) {
    // Preferred: Direct URL redirect (type-safe)
    window.location.href = data.url;
  } else if (data.sessionId) {
    // Legacy fallback: redirectToCheckout (deprecated but still functional)
    // Type assertion needed because method is deprecated in types
    interface LegacyStripe {
      redirectToCheckout: (options: {
        sessionId: string;
      }) => Promise<{ error?: { message: string } }>;
    }
    const legacyStripe = stripe as unknown as LegacyStripe;
    const { error } = await legacyStripe.redirectToCheckout({
      sessionId: data.sessionId,
    });
    if (error) {
      throw new Error(error.message || 'Failed to redirect to Stripe Checkout');
    }
  } else {
    throw new Error('Invalid response from checkout endpoint');
  }
}

/**
 * Handle return from Stripe Checkout
 * Verifies session and updates payment status
 */
export async function handleStripeRedirect(
  sessionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const stripe = await getStripe();
    if (!stripe) {
      throw new Error('Stripe failed to load');
    }

    // Retrieve session to check status
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/verify-stripe-session`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ session_id: sessionId }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to verify session');
    }

    const { payment_status } = await response.json();

    if (payment_status === 'paid') {
      return { success: true };
    } else {
      return { success: false, error: 'Payment not completed' };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Create Stripe subscription checkout
 *
 * Uses URL-based redirect (modern Stripe API) instead of deprecated redirectToCheckout.
 * Edge Function returns session.url for direct browser redirect.
 */
export async function createSubscriptionCheckout(
  priceId: string,
  customerEmail: string
): Promise<void> {
  // Note: We don't need the Stripe instance for URL-based redirect,
  // but we verify consent is granted
  const stripe = await getStripe();
  if (!stripe) {
    throw new Error('Stripe failed to load');
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-stripe-subscription`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        price_id: priceId,
        customer_email: customerEmail,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create subscription checkout');
  }

  const data = await response.json();

  // Modern approach: Edge Function returns session.url for direct redirect
  // Fallback: Legacy sessionId-based redirect (deprecated)
  if (data.url) {
    // Preferred: Direct URL redirect (type-safe)
    window.location.href = data.url;
  } else if (data.sessionId) {
    // Legacy fallback: redirectToCheckout (deprecated but still functional)
    // Type assertion needed because method is deprecated in types
    interface LegacyStripe {
      redirectToCheckout: (options: {
        sessionId: string;
      }) => Promise<{ error?: { message: string } }>;
    }
    const legacyStripe = stripe as unknown as LegacyStripe;
    const { error } = await legacyStripe.redirectToCheckout({
      sessionId: data.sessionId,
    });
    if (error) {
      throw new Error(error.message || 'Failed to redirect to Stripe Checkout');
    }
  } else {
    throw new Error('Invalid response from checkout endpoint');
  }
}
