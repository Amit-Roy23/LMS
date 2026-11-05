/** Loads Razorpay Checkout on demand and resolves with the signed payment result. */
let loader: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Browser only'));
  if ((window as any).Razorpay) return Promise.resolve();
  if (!loader) {
    loader = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => {
        loader = null;
        reject(new Error('Could not load Razorpay. Check your connection and try again.'));
      };
      document.body.appendChild(s);
    });
  }
  return loader;
}

export interface RazorpaySuccess {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export async function openRazorpayCheckout(payload: Record<string, any>): Promise<RazorpaySuccess> {
  await loadScript();
  return new Promise((resolve, reject) => {
    const rzp = new (window as any).Razorpay({
      ...payload,
      handler: (response: RazorpaySuccess) => resolve(response),
      modal: { ondismiss: () => reject(new Error('Payment cancelled')) },
    });
    rzp.on('payment.failed', (resp: any) => reject(new Error(resp?.error?.description || 'Payment failed')));
    rzp.open();
  });
}
