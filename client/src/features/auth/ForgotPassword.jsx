import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { forgotPassword, clearError } from './authSlice';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';
import Logo from '../../components/ui/Logo';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);
  const [successMessage, setSuccessMessage] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async (data) => {
    try {
      await dispatch(forgotPassword({ email: data.email })).unwrap();
      setSuccessMessage('Password reset link sent to your email.');
    } catch (err) {
      setSuccessMessage('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-brand-950 p-6 font-sans">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8 flex flex-col items-center">
          <Logo variant="full" theme="dark" iconClassName="w-12 h-12 mb-4" textClassName="text-3xl font-black" />
          <h2 className="text-xl font-bold text-white mt-2">Reset Password</h2>
          <p className="text-sm text-slate-400 mt-2">
            Enter your email to receive a password reset link.
          </p>
        </div>

        <Card className="glass-panel border-slate-800 shadow-2xl !p-7 text-white bg-slate-900/40">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {error && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-bold rounded-xl animate-fade-in">
                {error}
              </div>
            )}
            {successMessage && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-bold rounded-xl animate-fade-in">
                {successMessage}
              </div>
            )}

            <Input
              label="Email Address"
              type="email"
              placeholder="e.g. user@workconnect.com"
              error={errors.email?.message}
              required
              className="text-slate-800"
              {...register('email', {
                required: 'Email address is required',
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: 'Please enter a valid email address',
                },
              })}
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full !py-3 font-semibold shadow-lg shadow-brand-blue/20 hover:shadow-brand-blue/30"
              loading={loading}
            >
              Send Reset Link
            </Button>
          </form>

          <div className="mt-6 text-center text-xs font-medium text-slate-400">
            Remember your password?{' '}
            <button
              onClick={() => navigate('/login')}
              className="font-bold text-brand-blue hover:text-brand-accent underline transition-colors"
            >
              Back to Login
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;
