import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { signup, clearError } from './authSlice';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Card from '../../components/ui/Card';
import Logo from '../../components/ui/Logo';

const Signup = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { loading, error, isAuthenticated, user } = useSelector((state) => state.auth);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      role: 'CANDIDATE'
    }
  });

  useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  // We don't rely on isAuthenticated for signup anymore because of the OTP flow
  // Removed the useEffect for navigate on isAuthenticated here

  const onSubmit = async (data) => {
    try {
      const { confirmPassword, ...signupData } = data;
      await dispatch(signup(signupData)).unwrap();
      navigate('/verify-otp', { state: { email: data.email } });
    } catch (err) {
      // Error is handled by Redux and displayed in the UI
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-900 via-slate-950 to-brand-950 p-6 font-sans">
      <div className="w-full max-w-md animate-fade-in">
        {/* Brand Header */}
        <div className="text-center mb-8 flex flex-col items-center">
          <Logo variant="full" theme="dark" iconClassName="w-12 h-12 mb-4" textClassName="text-3xl font-black" />
          <p className="text-sm font-semibold text-slate-400 mt-2">
            Create an account to join the recruitment ecosystem
          </p>
        </div>

        <Card className="glass-panel border-slate-800 shadow-2xl p-7! text-white bg-slate-900/40">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-bold rounded-xl animate-fade-in">
                {error}
              </div>
            )}

            <Input
              label="Full Name"
              placeholder="e.g. John Doe"
              error={errors.name?.message}
              required
              className="text-slate-800"
              {...register('name', {
                required: 'Full Name is required',
              })}
            />

            <Input
              label="Email Address"
              type="email"
              placeholder="e.g. johndoe@gmail.com"
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

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              required
              className="text-slate-800"
              {...register('password', {
                required: 'Password is required',
                minLength: {
                  value: 6,
                  message: 'Password must be at least 6 characters long',
                },
              })}
            />

            <Input
              label="Confirm Password"
              type="password"
              placeholder="••••••••"
              error={errors.confirmPassword?.message}
              required
              className="text-slate-800"
              {...register('confirmPassword', {
                required: 'Please confirm your password',
                validate: (value) =>
                  value === watch('password') || 'Passwords do not match',
              })}
            />

            <Select
              label="I want to sign up as a:"
              options={[
                { value: 'CANDIDATE', label: 'Candidate (Job Seeker)' },
                { value: 'EMPLOYER', label: 'Employer (Hiring Company)' }
              ]}
              error={errors.role?.message}
              required
              className="text-slate-800"
              {...register('role', {
                required: 'Please select a signup role',
              })}
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full py-3! font-semibold shadow-lg shadow-brand-blue/20 hover:shadow-brand-blue/30 mt-2"
              loading={loading}
            >
              Get Started Free
            </Button>
          </form>

          <div className="mt-6 text-center text-xs font-medium text-slate-400">
            Already have an account?{' '}
            <button
              onClick={() => navigate('/login')}
              className="font-bold text-brand-blue hover:text-brand-accent underline transition-colors"
            >
              Sign In
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Signup;
