import React from 'react';
import { Card, Button, Toggle, InputField } from '../components/ui';
import { useTheme } from '../context/ThemeContext';

type FontSize = 'Small' | 'Medium' | 'Large';

const ACCESSIBILITY_OPTIONS = [
  { label: 'High Contrast Mode',      desc: 'Increase contrast for better visibility'       },
  { label: 'Reduced Motion',          desc: 'Minimize animations and transitions'           },
  { label: 'Screen Reader Friendly',  desc: 'Optimize layout for screen readers'            },
  { label: "Dyslexia-Friendly Font",  desc: 'Switch to OpenDyslexic font'                  },
];

const NOTIFICATION_OPTIONS = [
  { label: 'Email Notifications', desc: 'Receive booking confirmations via email', default: true  },
  { label: 'Booking Reminders',   desc: 'Get reminded 1 hour before your show',   default: true  },
  { label: 'Promotional Emails',  desc: 'Receive offers and new movie alerts',     default: false },
];

const Settings = () => {
  const { darkMode, setDarkMode, fontSize, setFontSize } = useTheme();

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
              <InputField label="Display Name"    placeholder="Your Name"          />
              <InputField label="Email Address"   type="email" placeholder="you@email.com" />
            </div>
            <Button>Save Changes</Button>
          </div>

          <div className="settings-section">
            <div className="settings-section-title">Change Password</div>
            <InputField label="Current Password" type="password" placeholder="••••••••" />
            <div className="input-row">
              <InputField label="New Password"     type="password" placeholder="••••••••" />
              <InputField label="Confirm Password" type="password" placeholder="••••••••" />
            </div>
            <Button>Update Password</Button>
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
          {ACCESSIBILITY_OPTIONS.map((item, i) => (
            <div key={i} className="settings-row">
              <div className="settings-row-info">
                <div className="settings-row-label">{item.label}</div>
                <div className="settings-row-desc">{item.desc}</div>
              </div>
              <Toggle checked={false} onChange={() => {}} />
            </div>
          ))}
        </div>
      </Card>

      {/* Notifications */}
      <Card title="Notifications">
        <div className="card-body">
          {NOTIFICATION_OPTIONS.map((item, i) => (
            <div key={i} className="settings-row">
              <div className="settings-row-info">
                <div className="settings-row-label">{item.label}</div>
                <div className="settings-row-desc">{item.desc}</div>
              </div>
              <Toggle checked={item.default} onChange={() => {}} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default Settings;
