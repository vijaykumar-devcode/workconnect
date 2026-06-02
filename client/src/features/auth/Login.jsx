import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { login, clearError } from './authSlice';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';
import Logo from '../../components/ui/Logo';

const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { loading, error, isAuthenticated, user } = useSelector((state) => state.auth);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  useEffect(() => {
    if (isAuthenticated && user) {
      const route = user.role === 'CANDIDATE' ? '/candidate' : `/${user.role.toLowerCase()}`;
      navigate(route);
    }
  }, [isAuthenticated, user, navigate]);

  const onSubmit = (data) => {
    dispatch(login(data));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-brand-950 p-6 font-sans">
      <div className="w-full max-w-md animate-fade-in">
        {/* Brand Header */}
        <div className="text-center mb-8 flex flex-col items-center">
          <Logo variant="full" theme="dark" iconClassName="w-12 h-12 mb-4" textClassName="text-3xl font-black" />
          <p className="text-sm font-semibold text-slate-400 mt-2">
            Sign in to manage your recruitment lifecycle
          </p>
        </div>

        <Card className="glass-panel border-slate-800 shadow-2xl !p-7 text-white bg-slate-900/40">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {error && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-bold rounded-xl animate-fade-in flex flex-col gap-2">
                <span>{error}</span>
                {error.toLowerCase().includes('verify') && (
                  <button
                    type="button"
                    onClick={() => navigate('/verify-otp')}
                    className="text-brand-blue underline text-left hover:text-brand-accent transition-colors w-max mt-1"
                  >
                    Go to Verification Screen
                  </button>
                )}
              </div>
            )}

            <Input
              label="Email Address"
              type="email"
              placeholder="e.g. candidate@workconnect.com"
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

            <div className="space-y-1">
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                error={errors.password?.message}
                required
                className="text-slate-800"
                {...register('password', {
                  required: 'Password is required',
                })}
              />
              <div className="flex justify-end w-full mt-1">
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="text-xs font-semibold text-brand-blue hover:text-brand-accent transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full !py-3 font-semibold shadow-lg shadow-brand-blue/20 hover:shadow-brand-blue/30"
              loading={loading}
            >
              Sign In
            </Button>
          </form>

          <div className="mt-6 text-center text-xs font-medium text-slate-400">
            Don't have an account?{' '}
            <button
              onClick={() => navigate('/signup')}
              className="font-bold text-brand-blue hover:text-brand-accent underline transition-colors"
            >
              Create Free Account
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Login;
