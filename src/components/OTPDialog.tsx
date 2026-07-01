import { useState, useEffect, useRef } from 'react';
import { X, Phone, ShieldCheck } from 'lucide-react';
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from 'firebase/auth';
import { auth } from '../firebase/config';
import toast from 'react-hot-toast';

interface OTPDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (phoneNumber: string) => void;
}

export function OTPDialog({ open, onClose, onSuccess }: OTPDialogProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [verificationId, setVerificationId] = useState<ConfirmationResult | null>(null);
  
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    if (!open) {
      setStep('phone');
      setPhoneNumber('');
      setOtpCode('');
      setVerificationId(null);
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear();
        recaptchaVerifierRef.current = null;
      }
    }
  }, [open]);

  if (!open) return null;

  async function handleSendOTP(e: React.FormEvent) {
    e.preventDefault();
    let cleanPhone = phoneNumber.trim();
    if (!cleanPhone) {
      toast.error('Please enter a phone number');
      return;
    }
    // Simple verification (must have country code for Firebase Phone Auth, e.g. +91)
    if (!cleanPhone.startsWith('+')) {
      // Default to +91 (India) if no country code supplied
      cleanPhone = '+91' + cleanPhone;
    }

    setLoading(true);
    try {
      // 1. Create Recaptcha verifier
      if (!recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
          'expired-callback': () => {
            toast.error('reCAPTCHA expired. Please try again.');
          }
        });
      }

      // 2. Sign in with Phone Number
      const confirmationResult = await signInWithPhoneNumber(auth, cleanPhone, recaptchaVerifierRef.current);
      setVerificationId(confirmationResult);
      setStep('otp');
      toast.success('OTP sent successfully!');
    } catch (err: any) {
      console.error('Error sending OTP:', err);
      toast.error(err.message || 'Failed to send OTP. Verify phone number and try again.');
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear();
        recaptchaVerifierRef.current = null;
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOTP(e: React.FormEvent) {
    e.preventDefault();
    if (!otpCode || otpCode.length !== 6) {
      toast.error('Please enter 6-digit OTP code');
      return;
    }
    if (!verificationId) {
      toast.error('Session expired. Send OTP again.');
      return;
    }

    setLoading(true);
    try {
      const result = await verificationId.confirm(otpCode);
      toast.success('Phone verified successfully!');
      onSuccess(result.user.phoneNumber || phoneNumber);
      onClose();
    } catch (err: any) {
      console.error('Error verifying OTP:', err);
      toast.error(err.message || 'Invalid verification code. Please check and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex justify-center items-end">
      <div className="absolute inset-0 bg-stone-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-h-[60dvh] max-w-[480px] bg-white shadow-2xl flex flex-col z-10 rounded-t-3xl overflow-hidden animate-[slideUp_0.3s_ease-out]">
        <div className="bg-white shrink-0 border-b border-stone-100 pt-3 pb-3">
          <div className="w-10 h-1.5 bg-stone-200 rounded-full mx-auto mb-3" />
          <div className="flex items-center justify-between px-5">
            <h3 className="text-lg font-bold text-stone-900 font-display">
              {step === 'phone' ? 'Verify Mobile Number' : 'Enter OTP Code'}
            </h3>
            <button onClick={onClose} className="h-8 w-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 hover:bg-stone-200">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Hidden recaptcha element */}
        <div id="recaptcha-container" className="hidden"></div>

        <div className="flex-1 px-5 py-6 text-left">
          {step === 'phone' ? (
            <form onSubmit={handleSendOTP} className="space-y-4">
              <p className="text-xs text-stone-500 leading-relaxed">
                We will send you a one-time password (OTP) to verify your account and validate this delivery order.
              </p>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">Phone Number</label>
                <div className="relative flex items-center">
                  <Phone className="absolute left-3.5 w-4 h-4 text-stone-400 pointer-events-none" />
                  <input
                    type="tel"
                    placeholder="Enter phone with country code (e.g. +91 98765 43210)"
                    value={phoneNumber}
                    onChange={e => setPhoneNumber(e.target.value)}
                    className="w-full bg-white border border-stone-200 rounded-xl pl-10 pr-4 py-2.5 text-[13px] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-stone-900"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2 text-sm disabled:opacity-50"
              >
                {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Send Verification Code
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <p className="text-xs text-stone-500 leading-relaxed">
                An OTP was sent to <strong className="text-stone-800">{phoneNumber}</strong>. Please enter the 6-digit code below.
              </p>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">Enter 6-Digit OTP</label>
                <div className="relative flex items-center">
                  <ShieldCheck className="absolute left-3.5 w-4 h-4 text-stone-400 pointer-events-none" />
                  <input
                    type="text"
                    maxLength={6}
                    pattern="\d{6}"
                    placeholder="e.g. 123456"
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-white border border-stone-200 rounded-xl pl-10 pr-4 py-2.5 text-[13px] tracking-[0.2em] font-mono text-center font-bold focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-stone-900"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('phone')}
                  className="flex-1 py-3.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-700 font-bold transition text-xs"
                >
                  Change Number
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-[2] py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2 text-xs disabled:opacity-50"
                >
                  {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  Verify &amp; Checkout
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
