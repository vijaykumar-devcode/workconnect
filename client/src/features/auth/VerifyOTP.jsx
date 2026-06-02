import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { verifyOtp, resendOtp, clearError } from './authSlice';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';
import Logo from '../../components/ui/Logo';

const VerifyOTP = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { loading, error, isAuthenticated, user } = useSelector((state) => state.auth);
  const email = location.state?.email || '';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: { email }
  });

  useEffect(() => {
    dispatch(clearError());
    if (!email) {
      navigate('/login');
    }
  }, [dispatch, email, navigate]);

  useEffect(() => {
    if (isAuthenticated && user) {
      const route = user.role === 'CANDIDATE' ? '/candidate' : `/${user.role.toLowerCase()}`;
      navigate(route);
    }
  }, [isAuthenticated, user, navigate]);

  const onSubmit = (data) => {
    dispatch(verifyOtp({ email: data.email, otp: data.otp }));
  };

  const handleResend = () => {
    if (email) {
      dispatch(resendOtp({ email }));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-brand-950 p-6 font-sans">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8 flex flex-col items-center">
          <Logo variant="full" theme="dark" iconClassName="w-12 h-12 mb-4" textClassName="text-3xl font-black" />
          <h2 className="text-xl font-bold text-white mt-2">Verify Your Account</h2>
          <p className="text-sm text-slate-400 mt-2">
            Enter the 6-digit code sent to <span className="font-semibold text-white">{email}</span>
          </p>
        </div>

        <Card className="glass-panel border-slate-800 shadow-2xl !p-7 text-white bg-slate-900/40">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {error && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-bold rounded-xl animate-fade-in">
                {error}
              </div>
            )}

            <input type="hidden" {...register('email')} />

            <Input
              label="6-Digit OTP"
              type="text"
              placeholder="000000"
              maxLength={6}
              error={errors.otp?.message}
              required
              className="text-slate-800 text-center tracking-[0.5em] font-bold text-lg"
              {...register('otp', {
                required: 'OTP is required',
                minLength: { value: 6, message: 'OTP must be 6 digits' },
                maxLength: { value: 6, message: 'OTP must be 6 digits' }
              })}
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full !py-3 font-semibold shadow-lg shadow-brand-blue/20 hover:shadow-brand-blue/30"
              loading={loading}
            >
              Verify Account
            </Button>
          </form>

          <div className="mt-6 text-center text-xs font-medium text-slate-400">
            Didn't receive the code?{' '}
            <button
              onClick={handleResend}
              disabled={loading}
              className="font-bold text-brand-blue hover:text-brand-accent underline transition-colors disabled:opacity-50"
            >
              Resend OTP
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default VerifyOTP;
