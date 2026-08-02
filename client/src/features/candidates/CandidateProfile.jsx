import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateProfile } from '../auth/authSlice';
import { useForm, useFieldArray } from 'react-hook-form';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { User, Mail, Phone, MapPin, Briefcase, Award, Plus, Trash2 } from 'lucide-react';

const CandidateProfile = () => {
  const dispatch = useDispatch();
  const { user, loading } = useSelector((state) => state.auth);
  const [success, setSuccess] = useState('');

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      address: user?.address || '',
      currentPosition: user?.currentPosition || '',
      experience: user?.experience || '',
      noticePeriod: user?.noticePeriod || '',
      expectedSalary: user?.expectedSalary || '',
      resumeUrl: user?.resumeUrl || '',
      skillsStr: user?.skills?.join(', ') || '',
      education: user?.education?.length ? user.education : [],
      projects: user?.projects?.length ? user.projects : [],
      certifications: user?.certifications?.length ? user.certifications : [],
    }
  });

  const { fields: eduFields, append: appendEdu, remove: removeEdu } = useFieldArray({ control, name: 'education' });
  const { fields: projFields, append: appendProj, remove: removeProj } = useFieldArray({ control, name: 'projects' });
  const { fields: certFields, append: appendCert, remove: removeCert } = useFieldArray({ control, name: 'certifications' });

  const onSubmit = async (data) => {
    try {
      const payload = {
        ...data,
        skills: data.skillsStr ? data.skillsStr.split(',').map(s => s.trim()).filter(s => s) : [],
        projects: data.projects.map(p => ({ ...p, technologies: typeof p.technologies === 'string' ? p.technologies.split(',').map(t => t.trim()) : p.technologies }))
      };
      delete payload.skillsStr;

      await dispatch(updateProfile(payload)).unwrap();
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      alert('Error updating profile');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-none mb-2">
          Profile Settings
        </h1>
        <p className="text-sm font-semibold text-slate-400">
          Manage your personal information, experience, salaries, and resume settings
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card Banner */}
        <div className="lg:col-span-1 space-y-6 self-start">
          <Card className="p-6" bodyClassName="flex flex-col items-center text-center">
            <div className="w-24 h-24 mx-auto rounded-full bg-brand-50 text-brand-500 flex items-center justify-center font-extrabold text-3xl shadow-md border-4 border-white mb-4">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <h3 className="text-lg font-bold text-slate-800 tracking-tight leading-none mb-1">
              {user?.name}
            </h3>
            <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
              {user?.role}
            </span>
            <div className="w-full h-1px bg-slate-100 my-5" />

            <div className="w-full text-left space-y-3.5">
              <div className="flex items-center gap-3 text-slate-500 text-xs font-semibold">
                <Mail size={16} />
                <span className="truncate">{user?.email}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-500 text-xs font-semibold">
                <Phone size={16} />
                <span>{user?.phone || 'No phone set'}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-500 text-xs font-semibold">
                <MapPin size={16} />
                <span>{user?.address || 'No address set'}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Input Settings */}
        <div className="lg:col-span-2">
          <Card title="Update Profile Details">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {success && (
                <div className="p-4.5 bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm font-semibold rounded-2xl animate-fade-in">
                  {success}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Input
                  label="Full Name"
                  error={errors.name?.message}
                  required
                  {...register('name', { required: 'Name is required' })}
                />
                <Input
                  label="Email Address"
                  disabled
                  error={errors.email?.message}
                  {...register('email')}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Input
                  label="Phone Number"
                  placeholder="e.g. +1 555-0199"
                  {...register('phone')}
                />
                <Input
                  label="Address Location"
                  placeholder="e.g. New York, USA"
                  {...register('address')}
                />
              </div>

              <div className="w-full h-1px bg-slate-100 my-6" />

              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Professional details</h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Input
                  label="Current Position / Title"
                  placeholder="e.g. Senior React Developer"
                  {...register('currentPosition')}
                />
                <Input
                  label="Years of Experience"
                  type="number"
                  placeholder="e.g. 5"
                  {...register('experience')}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Input
                  label="Notice Period"
                  placeholder="e.g. Immediate, 30 Days"
                  {...register('noticePeriod')}
                />
                <Input
                  label="Expected Salary ($ / yr)"
                  type="number"
                  placeholder="e.g. 95000"
                  {...register('expectedSalary')}
                />
              </div>

              <div className="w-full h-1px bg-slate-100 my-6" />

              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Resume & Skills</h4>

              <Input
                label="Master Resume Link (Cloud URL) *"
                placeholder="Paste Google Drive or Dropbox file URL"
                required
                {...register('resumeUrl', { required: 'Resume link is required to apply' })}
              />

              <Input
                label="Skills (Comma separated)"
                placeholder="e.g. React, Node.js, MongoDB"
                {...register('skillsStr')}
              />

              {/* Education Array */}
              <div className="w-full h-1px bg-slate-100 my-6" />
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Education</h4>
                <Button type="button" variant="outline" size="sm" onClick={() => appendEdu({ degree: '', institution: '', graduationYear: '' })}>
                  <Plus size={14} className="mr-1" /> Add Education
                </Button>
              </div>
              {eduFields.map((item, index) => (
                <div key={item.id} className="p-4 bg-slate-50 border border-slate-100 rounded-xl mb-3 relative">
                  <button type="button" onClick={() => removeEdu(index)} className="absolute top-4 right-4 text-rose-400 hover:text-rose-600"><Trash2 size={16} /></button>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pr-6">
                    <Input label="Degree" placeholder="e.g. B.S. Computer Science" {...register(`education.${index}.degree`)} />
                    <Input label="Institution" placeholder="e.g. MIT" {...register(`education.${index}.institution`)} />
                    <Input label="Graduation Year" type="number" placeholder="e.g. 2024" {...register(`education.${index}.graduationYear`)} />
                  </div>
                </div>
              ))}

              {/* Projects Array */}
              <div className="w-full h-1px bg-slate-100 my-6" />
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Projects</h4>
                <Button type="button" variant="outline" size="sm" onClick={() => appendProj({ title: '', description: '', technologies: '' })}>
                  <Plus size={14} className="mr-1" /> Add Project
                </Button>
              </div>
              {projFields.map((item, index) => (
                <div key={item.id} className="p-4 bg-slate-50 border border-slate-100 rounded-xl mb-3 relative">
                  <button type="button" onClick={() => removeProj(index)} className="absolute top-4 right-4 text-rose-400 hover:text-rose-600"><Trash2 size={16} /></button>
                  <div className="space-y-4 pr-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input label="Project Title" placeholder="e.g. E-Commerce Platform" {...register(`projects.${index}.title`)} />
                      <Input label="Technologies (Comma separated)" placeholder="e.g. React, Stripe" {...register(`projects.${index}.technologies`)} />
                    </div>
                    <Input label="Description" placeholder="Brief description of your role and what you built" {...register(`projects.${index}.description`)} />
                  </div>
                </div>
              ))}

              {/* Certifications Array */}
              <div className="w-full h-1px bg-slate-100 my-6" />
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Certifications</h4>
                <Button type="button" variant="outline" size="sm" onClick={() => appendCert({ name: '', issuer: '', issueDate: '' })}>
                  <Plus size={14} className="mr-1" /> Add Certification
                </Button>
              </div>
              {certFields.map((item, index) => (
                <div key={item.id} className="p-4 bg-slate-50 border border-slate-100 rounded-xl mb-3 relative">
                  <button type="button" onClick={() => removeCert(index)} className="absolute top-4 right-4 text-rose-400 hover:text-rose-600"><Trash2 size={16} /></button>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pr-6">
                    <Input label="Name" placeholder="e.g. AWS Solutions Architect" {...register(`certifications.${index}.name`)} />
                    <Input label="Issuer" placeholder="e.g. Amazon" {...register(`certifications.${index}.issuer`)} />
                    <Input label="Issue Date" type="date" {...register(`certifications.${index}.issueDate`)} />
                  </div>
                </div>
              ))}

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <Button type="submit" variant="primary" loading={loading}>
                  Save Settings
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CandidateProfile;
