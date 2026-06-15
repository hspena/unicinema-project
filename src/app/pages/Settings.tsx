import React, { useState, useEffect } from 'react';
import { Card, Button, Toggle, InputField } from '../components/ui';
import { useTheme, AccessibilitySettings } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { getUserById, updateUser, changePassword } from '../services/userService';
import {
  NotificationPrefs, DEFAULT_NOTIFICATION_PREFS,
  getNotificationPrefs, saveNotificationPrefs,
} from '../utils/preferences';

type FontSize = 'Small' | 'Medium' | 'Large';

const ACCESSIBILITY_OPTIONS: { key: keyof AccessibilitySettings; label: string; desc: string }[] = [
  { key: 'highContrast',  label: 'High Contrast Mode',     desc: 'Increase contrast for better visibility'  },
  { key: 'reducedMotion', label: 'Reduced Motion',         desc: 'Minimize animations and transitions'      },
  { key: 'screenReader',  label: 'Screen Reader Friendly', desc: 'Optimize layout for screen readers'       },
  { key: 'dyslexiaFont',  label: 'Dyslexia-Friendly Font', desc: 'Switch to a more legible, spaced font'     },
];

const NOTIFICATION_OPTIONS: { key: keyof NotificationPrefs; label: string; desc: string }[] = [
  { key: 'bookingConfirmations', label: 'Booking Confirmations', desc: 'Get notified when a ticket is booked'   },
  { key: 'bookingReminders',     label: 'Booking Reminders',     desc: 'Get reminded before your show starts'   },
  { key: 'promotions',           label: 'New Movie & Offers',    desc: 'Receive new-movie and promotional alerts' },
];

const Settings = () => {
  const { darkMode, setDarkMode, fontSize, setFontSize, a11y, setA11y } = useTheme();
  const { uid } = useAuth();

  // ── Profile ──────────────────────────────────────────────────────────────
  const [displayName, setDisplayName] = useState('');
  const [email,       setEmail]       = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg,    setProfileMsg]    = useState<{ ok: boolean; text: string } | null>(null);

  // ── Password ─────────────────────────────────────────────────────────────
  const [curPw,  setCurPw]  = useState('');
  const [newPw,  setNewPw]  = useState('');
  const [confPw, setConfPw] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg,    setPwMsg]    = useState<{ ok: boolean; text: string } | null>(null);

  // ── Notification prefs ───────────────────────────────────────────────────
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>(DEFAULT_NOTIFICATION_PREFS);

  // Load current profile + notification prefs.
  useEffect(() => {
    if (!uid) return;
    let active = true;
    (async () => {
      const [user, prefs] = await Promise.all([
        getUserById(uid),
        getNotificationPrefs(uid),
      ]);
      if (!active) return;
      if (user) {
        setDisplayName(user.displayName ?? user.name ?? '');
        setEmail(user.email ?? '');
      }
      setNotifPrefs(prefs);
    })();
    return () => { active = false; };
  }, [uid]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    if (!uid) return;
    setProfileMsg(null);
    if (!displayName.trim()) {
      setProfileMsg({ ok: false, text: 'Display name cannot be empty.' });
      return;
    }
    setProfileSaving(true);
    try {
      await updateUser(uid, { displayName: displayName.trim() });
      setProfileMsg({ ok: true, text: 'Profile updated.' });
    } catch (e: any) {
      setProfileMsg({ ok: false, text: e.message ?? 'Failed to update profile.' });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setPwMsg(null);
    if (!curPw || !newPw || !confPw) {
      setPwMsg({ ok: false, text: 'Please fill in all password fields.' });
      return;
    }
    if (newPw.length < 6) {
      setPwMsg({ ok: false, text: 'New password must be at least 6 characters.' });
      return;
    }
    if (newPw !== confPw) {
      setPwMsg({ ok: false, text: 'New passwords do not match.' });
      return;
    }
    setPwSaving(true);
    try {
      await changePassword(curPw, newPw);
      setPwMsg({ ok: true, text: 'Password updated successfully.' });
      setCurPw(''); setNewPw(''); setConfPw('');
    } catch (e: any) {
      const text =
        e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential'
          ? 'Current password is incorrect.'
          : e.code === 'auth/weak-password'
          ? 'New password is too weak.'
          : e.message ?? 'Failed to update password.';
      setPwMsg({ ok: false, text });
    } finally {
      setPwSaving(false);
    }
  };

  const handleToggleNotif = (key: keyof NotificationPrefs) => {
    if (!uid) return;
    const next = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(next);
    saveNotificationPrefs(uid, next);
  };

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h2>Settings</h2>
        <p>Manage your account, appearance, and accessibility preferences.</p>
      </div>

      {/* Account */}
      <Card title="Account Settings">
        <div className="card-body">
          <div className="settings-section">
            <div className="settings-section-title">Profile</div>
            <div className="input-row">
              <InputField
                label="Display Name"
                placeholder="Your Name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
              <InputField
                label="Email Address"
                type="email"
                value={email}
                disabled
                title="Email cannot be changed here"
              />
            </div>
            {profileMsg && (
              <div className={`settings-msg ${profileMsg.ok ? 'settings-msg-ok' : 'settings-msg-err'}`}>
                {profileMsg.text}
              </div>
            )}
            <Button onClick={handleSaveProfile} disabled={profileSaving}>
              {profileSaving ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>

          <div className="settings-section">
            <div className="settings-section-title">Change Password</div>
            <InputField
              label="Current Password" type="password" placeholder="••••••••"
              value={curPw} onChange={(e) => setCurPw(e.target.value)}
            />
            <div className="input-row">
              <InputField
                label="New Password" type="password" placeholder="••••••••"
                value={newPw} onChange={(e) => setNewPw(e.target.value)}
              />
              <InputField
                label="Confirm Password" type="password" placeholder="••••••••"
                value={confPw} onChange={(e) => setConfPw(e.target.value)}
              />
            </div>
            {pwMsg && (
              <div className={`settings-msg ${pwMsg.ok ? 'settings-msg-ok' : 'settings-msg-err'}`}>
                {pwMsg.text}
              </div>
            )}
            <Button onClick={handleChangePassword} disabled={pwSaving}>
              {pwSaving ? 'Updating…' : 'Update Password'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Appearance */}
      <Card title="Appearance & Theme">
        <div className="card-body">
          <div className="settings-row">
            <div className="settings-row-info">
              <div className="settings-row-label">Dark Mode</div>
              <div className="settings-row-desc">Toggle between dark and light interface</div>
            </div>
            <Toggle checked={darkMode} onChange={(e) => setDarkMode(e.target.checked)} />
          </div>
          <div className="settings-row">
            <div className="settings-row-info">
              <div className="settings-row-label">Font Size</div>
              <div className="settings-row-desc">Adjust text size for better readability</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['Small', 'Medium', 'Large'] as FontSize[]).map((size) => (
                <button
                  key={size}
                  className={`btn ${fontSize === size ? 'btn-primary' : 'btn-outline'} btn-sm`}
                  onClick={() => setFontSize(size)}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Accessibility */}
      <Card title="Accessibility">
        <div className="card-body">
          {ACCESSIBILITY_OPTIONS.map((item) => (
            <div key={item.key} className="settings-row">
              <div className="settings-row-info">
                <div className="settings-row-label">{item.label}</div>
                <div className="settings-row-desc">{item.desc}</div>
              </div>
              <Toggle
                checked={a11y[item.key]}
                onChange={(e) => setA11y(item.key, e.target.checked)}
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Notifications */}
      <Card title="Notifications">
        <div className="card-body">
          {NOTIFICATION_OPTIONS.map((item) => (
            <div key={item.key} className="settings-row">
              <div className="settings-row-info">
                <div className="settings-row-label">{item.label}</div>
                <div className="settings-row-desc">{item.desc}</div>
              </div>
              <Toggle
                checked={notifPrefs[item.key]}
                onChange={() => handleToggleNotif(item.key)}
                disabled={!uid}
              />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default Settings;
