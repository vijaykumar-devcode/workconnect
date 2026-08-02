import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { verifyOnboardingDoc, fetchApplications } from './applicationSlice';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { FileText, CheckCircle, XCircle, ExternalLink, Clock } from 'lucide-react';

const OnboardingReviewModal = ({ isOpen, onClose, application }) => {
  const dispatch = useDispatch();
  const [processingId, setProcessingId] = useState(null);

  if (!application) return null;

  const docs = application.onboardingDocuments || [];

  const handleVerify = async (docId, status) => {
    setProcessingId(docId);
    try {
      await dispatch(verifyOnboardingDoc({
        appId: application._id,
        docId: docId,
        status: status
      })).unwrap();

      // Refresh the application list to reflect status changes
      dispatch(fetchApplications());
      alert(`Document marked as ${status}`);
    } catch (err) {
      alert(err || 'Failed to update document status');
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Verified':
        return <Badge type="success"><CheckCircle size={12} className="mr-1" /> Verified</Badge>;
      case 'Rejected':
        return <Badge type="danger"><XCircle size={12} className="mr-1" /> Rejected</Badge>;
      default:
        return <Badge type="warning"><Clock size={12} className="mr-1" /> Pending</Badge>;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Onboarding Documents: ${application.candidate?.name}`} maxWidth="max-w-3xl">
      <div className="space-y-6">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
          <p className="text-sm font-medium text-slate-600">
            Review the uploaded onboarding documents below. Click to view the file and approve or reject it.
          </p>
        </div>

        {docs.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <FileText className="mx-auto h-10 w-10 text-slate-300 mb-3" />
            <p className="text-sm font-semibold text-slate-500">No onboarding documents uploaded yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {docs.map((doc) => (
              <div key={doc._id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:shadow-sm transition-shadow gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="p-2.5 bg-brand-50 rounded-lg text-brand-600 shrink-0">
                    <FileText size={24} />
                  </div>
                  <div className="min-w-0 overflow-hidden">
                    <h4 className="text-sm font-extrabold text-slate-800 truncate">{doc.docType}</h4>
                    <div className="flex items-center gap-3 mt-1.5 text-xs">
                      {getStatusBadge(doc.status)}
                      <span className="text-slate-400 font-medium">
                        Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end sm:border-l sm:border-slate-100 sm:pl-4">
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors"
                  >
                    <ExternalLink size={14} /> View File
                  </a>

                  {doc.status !== 'Verified' && (
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => handleVerify(doc._id, 'Verified')}
                      disabled={processingId === doc._id}
                      className="!px-3 !py-1.5"
                    >
                      {processingId === doc._id ? '...' : 'Approve'}
                    </Button>
                  )}

                  {doc.status !== 'Rejected' && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleVerify(doc._id, 'Rejected')}
                      disabled={processingId === doc._id}
                      className="!px-3 !py-1.5"
                    >
                      {processingId === doc._id ? '...' : 'Reject'}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-4 border-t border-slate-100 mt-6">
          <Button variant="outline" onClick={onClose}>Close Window</Button>
        </div>
      </div>
    </Modal>
  );
};

export default OnboardingReviewModal;
