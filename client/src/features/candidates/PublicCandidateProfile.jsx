import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Briefcase, BookOpen, FolderKanban, FileText, Shield } from 'lucide-react';
import api from '../../services/api';
import Card from '../../components/ui/Card';

const PublicCandidateProfile = () => {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;

    const loadProfile = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/auth/public/${id}`);
        if (alive) {
          setProfile(response?.data?.user || null);
          setError('');
        }
      } catch (err) {
        if (alive) {
          setProfile(null);
          setError(err.message || 'Public profile not found');
        }
      } finally {
        if (alive) setLoading(false);
      }
    };

    loadProfile();

    return () => {
      alive = false;
    };
  }, [id]);

  if (loading) {
    return <div className="p-6 text-sm font-semibold text-slate-500">Loading public profile...</div>;
  }

  if (!profile || error) {
    return (
      <div className="p-6">
        <Card>
          <div className="space-y-4">
            <p className="text-sm font-semibold text-rose-600">{error || 'Public profile unavailable.'}</p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft size={16} /> Back to home
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-blue">Public Candidate Profile</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{profile.name}</h1>
          <p className="text-sm font-semibold text-slate-500">{profile.currentPosition || 'Open to opportunities'}</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
          <Shield size={14} /> Public-safe fields only
        </div>
      </div>

      <Card>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
              <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-brand-blue text-2xl font-black text-white">
                {profile.name?.charAt(0) || 'C'}
              </div>
              <h2 className="text-xl font-bold text-slate-900">{profile.name}</h2>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{profile.role}</p>
              <div className="mt-4 text-sm text-slate-600">
                {typeof profile.experience === 'number' ? `${profile.experience} years experience` : 'Experience not provided'}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold"><Briefcase size={16} /> Work Experience</div>
              <p className="text-sm text-slate-600">
                {profile.currentPosition || 'Current position not provided'}
                {typeof profile.experience === 'number' ? ` • ${profile.experience} years` : ''}
              </p>
            </section>

            <section className="space-y-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold"><BookOpen size={16} /> Skills</div>
              <div className="flex flex-wrap gap-2">
                {(profile.skills || []).length > 0 ? profile.skills.map((skill) => (
                  <span key={skill} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{skill}</span>
                )) : <p className="text-sm text-slate-500">No skills listed.</p>}
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold"><FolderKanban size={16} /> Projects</div>
              <div className="space-y-3">
                {(profile.projects || []).length > 0 ? profile.projects.map((project, index) => (
                  <div key={`${project.title || 'project'}-${index}`} className="rounded-xl border border-slate-200 p-4">
                    <p className="font-semibold text-slate-900">{project.title || 'Untitled Project'}</p>
                    <p className="text-sm text-slate-600 mt-1">{project.description || 'No description provided.'}</p>
                    {(project.technologies || []).length > 0 && (
                      <p className="text-xs font-semibold text-slate-500 mt-2">{project.technologies.join(', ')}</p>
                    )}
                  </div>
                )) : <p className="text-sm text-slate-500">No projects shared publicly.</p>}
              </div>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card title="Education" bodyClassName="space-y-3">
                {(profile.education || []).length > 0 ? profile.education.map((item, index) => (
                  <div key={`${item.degree || 'education'}-${index}`} className="rounded-xl bg-slate-50 p-3">
                    <p className="font-semibold text-slate-900">{item.degree || 'Degree not provided'}</p>
                    <p className="text-sm text-slate-600">{item.institution || 'Institution not provided'}</p>
                    <p className="text-xs text-slate-500">{item.graduationYear || ''}</p>
                  </div>
                )) : <p className="text-sm text-slate-500">No education details shared publicly.</p>}
              </Card>

              <Card title="Certifications" bodyClassName="space-y-3">
                {(profile.certifications || []).length > 0 ? profile.certifications.map((item, index) => (
                  <div key={`${item.name || 'certification'}-${index}`} className="rounded-xl bg-slate-50 p-3">
                    <p className="font-semibold text-slate-900">{item.name || 'Certification not provided'}</p>
                    <p className="text-sm text-slate-600">{item.issuer || 'Issuer not provided'}</p>
                  </div>
                )) : <p className="text-sm text-slate-500">No certifications shared publicly.</p>}
              </Card>
            </section>

            {profile.resumeUrl && (
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-slate-900 font-bold"><FileText size={16} /> Resume</div>
                <a href={profile.resumeUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-brand-blue hover:underline">
                  View resume
                </a>
              </section>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PublicCandidateProfile;
