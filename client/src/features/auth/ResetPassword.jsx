import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { resetPassword, clearError } from './authSlice';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';
import Logo from '../../components/ui/Logo';

const ResetPassword = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { loading, error } = useSelector((state) => state.auth);
  const [successMessage, setSuccessMessage] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();

  const onSubmit = async (data) => {
    if (!token) {
      return;
    }
    try {
      await dispatch(resetPassword({ token, password: data.password })).unwrap();
      setSuccessMessage('Password reset successfully. You can now login.');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setSuccessMessage('');
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-brand-950 p-6 font-sans">
        <Card className="glass-panel p-8 text-center text-white">
          <h2 className="text-xl font-bold mb-4">Invalid Reset Link</h2>
          <p className="text-slate-400 mb-6">No reset token found in the URL.</p>
          <Button onClick={() => navigate('/forgot-password')} variant="primary">
            Request New Link
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-brand-950 p-6 font-sans">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8 flex flex-col items-center">
          <Logo variant="full" theme="dark" iconClassName="w-12 h-12 mb-4" textClassName="text-3xl font-black" />
          <h2 className="text-xl font-bold text-white mt-2">Create New Password</h2>
          <p className="text-sm text-slate-400 mt-2">
            Please enter your new password below.
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
              label="New Password"
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              required
              className="text-slate-800"
              {...register('password', {
                required: 'Password is required',
                minLength: {
                  value: 6,
                  message: 'Password must be at least 6 characters',
                },
              })}
            />

            <Input
              label="Confirm New Password"
              type="password"
              placeholder="••••••••"
              error={errors.confirmPassword?.message}
              required
              className="text-slate-800"
              {...register('confirmPassword', {
                required: 'Please confirm your password',
                validate: (val) => {
                  if (watch('password') != val) {
                    return 'Your passwords do no match';
                  }
                },
              })}
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full !py-3 font-semibold shadow-lg shadow-brand-blue/20 hover:shadow-brand-blue/30"
              loading={loading}
              disabled={!!successMessage}
            >
              Reset Password
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
