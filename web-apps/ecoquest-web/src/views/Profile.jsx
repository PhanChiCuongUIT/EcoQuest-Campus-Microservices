import React, { useEffect, useState } from 'react';
import { Camera, CheckCircle2, Mail, Save, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { updateMyProfile, uploadAvatar } from '../api/ecoquestApi.js';
import { useConfirm } from '../components/ConfirmDialog.jsx';
import { useToast } from '../components/Toast.jsx';

const MAX_AVATAR_BYTES = 3 * 1024 * 1024;

export default function Profile() {
  const { user, updateSessionUser } = useAuth();
  const confirm = useConfirm();
  const toast = useToast();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDisplayName(user?.displayName || '');
    setAvatarUrl(user?.avatarUrl || '');
  }, [user]);

  const save = async () => {
    if (!displayName.trim()) return;
    const accepted = await confirm({
      title: 'Save profile changes?',
      message: 'Your display name and avatar link will be updated across EcoQuest.',
      confirmLabel: 'Save profile',
    });
    if (!accepted) return;
    setSaving(true);
    try {
      const profile = await updateMyProfile({ displayName: displayName.trim(), avatarUrl });
      updateSessionUser(profile);
      toast({ type: 'success', message: 'Profile updated' });
    } catch (error) {
      toast({ type: 'error', message: 'Profile update failed', sub: error?.response?.data?.message || error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ type: 'warning', message: 'Choose an image file' });
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast({ type: 'warning', message: 'Avatar is too large', sub: 'Maximum size is 3MB.' });
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const profile = await uploadAvatar({ fileName: file.name, contentType: file.type, dataUrl });
      setAvatarUrl(profile.avatarUrl);
      updateSessionUser(profile);
      toast({ type: 'success', message: 'Avatar uploaded', sub: 'Stored in the Identity service media bucket.' });
    } catch (error) {
      toast({ type: 'error', message: 'Avatar upload failed', sub: error?.response?.data?.message || error.message });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="profile-layout">
      <section className="profile-identity-panel">
        <div className="profile-avatar-wrap">
          <img src={avatarUrl || '/logo.png'} alt={user?.displayName || 'Profile'} />
          <label className="profile-avatar-action" title="Upload avatar">
            <Camera size={16} />
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleFile} />
          </label>
        </div>
        <h2>{user?.displayName || user?.email}</h2>
        <p>{user?.email}</p>
        <div className="profile-badges">
          <span className="badge badge-info"><ShieldCheck size={12} /> {user?.role}</span>
          <span className="badge badge-accepted"><CheckCircle2 size={12} /> {user?.status}</span>
        </div>
        <dl className="profile-facts">
          <div><dt>Student ID</dt><dd>{user?.studentId || 'Not assigned'}</dd></div>
          <div><dt>Email verified</dt><dd>{user?.emailVerified ? 'Verified' : 'Pending'}</dd></div>
          <div><dt>Image storage</dt><dd>{avatarUrl?.startsWith('/auth/media/') ? 'EcoQuest MinIO' : 'External URL'}</dd></div>
        </dl>
      </section>

      <section className="profile-form-panel">
        <div className="page-intro compact">
          <div>
            <h2>Personal information</h2>
            <p>Keep your campus identity recognizable to moderators and administrators.</p>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="profile-name"><User size={14} /> Display name</label>
          <input id="profile-name" className="form-input" value={displayName} onChange={event => setDisplayName(event.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="profile-email"><Mail size={14} /> Email</label>
          <input id="profile-email" className="form-input" value={user?.email || ''} disabled />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="profile-avatar-url">Avatar URL</label>
          <input id="profile-avatar-url" className="form-input" value={avatarUrl} onChange={event => setAvatarUrl(event.target.value)} placeholder="Upload an image or enter an HTTPS URL" />
          <small className="form-help">Uploaded files are persisted by Identity service and remain available on another device.</small>
        </div>
        <div className="profile-actions">
          <label className="btn btn-outline">
            <Camera size={16} /> {uploading ? 'Uploading...' : 'Choose avatar'}
            <input type="file" hidden accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleFile} disabled={uploading} />
          </label>
          <button className="btn btn-primary" onClick={save} disabled={saving || !displayName.trim()}>
            <Save size={16} /> {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </section>
    </div>
  );
}
