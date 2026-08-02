import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMyCompany, registerCompany, updateMyCompany } from './companySlice';
import { useForm } from 'react-hook-form';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { UploadCloud, Loader2, Building, Compass, Globe, MapPin, CheckCircle } from 'lucide-react';
import api from '../../services/api';

const EmployerCompany = () => {
  const dispatch = useDispatch();
  const { company, loading } = useSelector((state) => state.companies);
  const [success, setSuccess] = useState('');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);


  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm();

  useEffect(() => {
    dispatch(fetchMyCompany());
  }, [dispatch]);

  useEffect(() => {
    if (company) {
      setValue('name', company.name);
      setValue('logo', company.logo);
      setValue('description', company.description);
      setValue('industry', company.industry);
      setValue('website', company.website);
      setValue('location', company.location);
      setValue('benefits', company.benefits?.join(', ') || '');
    }
  }, [company, setValue]);

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploadingLogo(true);
    const formData = new FormData();
    formData.append('file', file);
    // Specify canonical upload category expected by server
    formData.append('category', 'company_logo');

    try {
      const response = await api.post('/upload', formData);

      setValue('logo', response.data.fileUrl);
      setSuccess('Logo uploaded successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      alert(err.message || 'Error uploading logo');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      const formatted = {
        ...data,
        benefits: data.benefits ? data.benefits.split(',').map(b => b.trim()) : []
      };

      if (company) {
        await dispatch(updateMyCompany(formatted)).unwrap();
        setSuccess('Company profile updated successfully!');
      } else {
        await dispatch(registerCompany(formatted)).unwrap();
        setSuccess('Company profile registered successfully! Pending verification review.');
      }
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      alert(err || 'Failed to update company settings.');
    }
  };

  const handleInviteRecruiter = async (e) => {
    e.preventDefault();
    try {
      await dispatch(addRecruiter(newRecruiter)).unwrap();
      setIsInviteOpen(false);
      setNewRecruiter({ name: '', email: '', password: '' });
      alert('Recruiter invited successfully. They will receive an email with their credentials and verification OTP.');
    } catch (err) {
      alert(err || 'Failed to invite recruiter.');
    }
  };

  const handleRemoveRecruiter = async (recruiterId) => {
    if (!window.confirm('Are you sure you want to remove this recruiter?')) return;
    try {
      await dispatch(removeRecruiter(recruiterId)).unwrap();
      alert('Recruiter removed.');
    } catch (err) {
      alert(err || 'Failed to remove recruiter.');
    }
  };

  const recruiterColumns = [
    { title: 'Name', key: 'name', render: (row) => <span className="font-bold text-slate-800">{row.name}</span> },
    { title: 'Email Address', key: 'email', render: (row) => <span className="text-slate-500">{row.email}</span> },
    { title: 'Status', key: 'status', render: (row) => <Badge type={row.isEmailVerified ? 'success' : 'warning'}>{row.isEmailVerified ? 'Verified' : 'Pending OTP'}</Badge> },
    {
      title: 'Actions',
      key: 'actions',
      render: (row) => (
        <button onClick={() => handleRemoveRecruiter(row._id)} className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500 transition-colors" title="Remove Recruiter">
          <Trash2 size={16} />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-theme-text-primary tracking-tight leading-none mb-2">
          Company Settings
        </h1>
        <p className="text-sm font-semibold text-slate-400">
          Setup and edit your corporate identity, branding assets, industry vertical and location
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Company Card Header */}
        <div className="lg:col-span-1 space-y-6">
          <Card bodyClassName="flex flex-col items-center justify-center text-center p-6">
            <div className="w-24 h-24 mx-auto rounded-2xl bg-brand-50 text-brand-500 flex items-center justify-center font-extrabold text-3xl shadow-md border border-slate-100 mb-4 overflow-hidden">
              {company?.logo ? (
                <img src={company.logo?.startsWith('http') ? company.logo : `${import.meta.env.VITE_API_URL || ''}${company.logo}`} alt="logo" className="w-full h-full object-contain p-2" />
              ) : (
                company?.name?.charAt(0) || 'C'
              )}
            </div>
            <h3 className="text-lg font-bold text-slate-800 tracking-tight leading-none mb-1">
              {company?.name || 'Register Company'}
            </h3>
            <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
              {company?.industry || 'Setup Industry'}
            </span>
            <div className="mt-2.5">
              <Badge type={company?.isVerified ? 'success' : 'warning'}>
                {company?.isVerified ? 'Verified Company' : 'Pending Verification'}
              </Badge>
            </div>

            <div className="w-full h-1px bg-slate-100 my-5" />

            <div className="w-full text-left space-y-3.5">
              <div className="flex items-center gap-3 text-slate-500 text-xs font-semibold">
                <Compass size={16} />
                <span>{company?.industry || 'Not set'}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-500 text-xs font-semibold">
                <Globe size={16} />
                <span className="truncate">{company?.website || 'No website set'}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-500 text-xs font-semibold">
                <MapPin size={16} />
                <span>{company?.location || 'No location set'}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Input Settings */}
        <div className="lg:col-span-2">
          <Card title={company ? 'Update Corporate Dossier' : 'Register Corporate Account'}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {success && (
                <div className="p-4.5 bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm font-semibold rounded-2xl animate-fade-in">
                  {success}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Input
                  label="Company Name"
                  placeholder="e.g. Acme Tech Inc"
                  error={errors.name?.message}
                  required
                  {...register('name', { required: 'Company Name is required' })}
                />

                <div className="flex flex-col space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Company Logo</label>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleLogoUpload}
                      disabled={isUploadingLogo}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    />
                    <div className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed ${isUploadingLogo ? 'border-brand-300 bg-brand-50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'} transition-colors`}>
                      {isUploadingLogo ? (
                        <>
                          <Loader2 className="w-5 h-5 text-brand-500 animate-spin" />
                          <span className="text-sm font-semibold text-brand-600">Uploading...</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud className="w-5 h-5 text-slate-400" />
                          <span className="text-sm font-semibold text-slate-600">Click to upload image</span>
                        </>
                      )}
                    </div>
                  </div>
                  {/* Hidden input to keep react-hook-form happy */}
                  <input type="hidden" {...register('logo')} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Input
                  label="Industry Segment"
                  placeholder="e.g. Software, Healthcare"
                  error={errors.industry?.message}
                  required
                  {...register('industry', { required: 'Industry is required' })}
                />
                <Input
                  label="HQ Location"
                  placeholder="e.g. San Francisco, CA"
                  error={errors.location?.message}
                  required
                  {...register('location', { required: 'HQ Location is required' })}
                />
              </div>

              <Input
                label="Corporate Website"
                placeholder="e.g. https://acmetech.com"
                {...register('website')}
              />

              <div className="flex flex-col space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Company Description</label>
                <textarea
                  rows={4}
                  className="form-input"
                  placeholder="Tell potential candidates about your company values, goals, and history..."
                  required
                  {...register('description', { required: 'Description is required' })}
                />
                {errors.description && <span className="text-xs text-rose-500 font-medium">{errors.description.message}</span>}
              </div>

              <Input
                label="Fringe Benefits (comma separated)"
                placeholder="e.g. Full Medical, Equity Options, Remote Flexibility"
                {...register('benefits')}
              />

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <Button type="submit" variant="primary" loading={loading} disabled={isUploadingLogo}>
                  {company ? 'Save Profile' : 'Register Profile'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>

    </div>
  );
};

export default EmployerCompany;
