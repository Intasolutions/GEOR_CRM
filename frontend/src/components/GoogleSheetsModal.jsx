import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, FileSpreadsheet, Copy, Check, RefreshCw, Zap,
  ArrowRight, ChevronRight, ExternalLink, Info,
  Shield, Clock, AlertCircle, CheckCircle2
} from 'lucide-react';
import api from '../api/client';

const CRM_ENDPOINT = 'https://crm.in-tasolutions.com/api/leads/sheet_import/';

const generateToken = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 40 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

const GoogleSheetsModal = ({ isOpen, onClose, onRefresh }) => {
  const [step, setStep] = React.useState(1); // 1=Setup, 2=Script, 3=Done
  const [token, setToken] = React.useState('');
  const [stages, setStages] = React.useState([]);
  const [defaultStageId, setDefaultStageId] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [copiedToken, setCopiedToken] = React.useState(false);
  const [copiedScript, setCopiedScript] = React.useState(false);
  const [existing, setExisting] = React.useState(null);
  const [loadingExisting, setLoadingExisting] = React.useState(false);
  const [testResult, setTestResult] = React.useState(null);
  const [testing, setTesting] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen) return;
    // Fetch stages
    api.get('stages/').then(r => {
      setStages(r.data || []);
      if (r.data && r.data.length > 0) setDefaultStageId(String(r.data[0].id));
    }).catch(() => {});

    // Check if already configured
    setLoadingExisting(true);
    api.get('integrations/').then(r => {
      const sheetsEntry = (r.data || []).find(i => i.provider === 'sheets');
      if (sheetsEntry && sheetsEntry.config_data?.import_token) {
        setExisting(sheetsEntry);
        setToken(sheetsEntry.config_data.import_token);
        setDefaultStageId(String(sheetsEntry.config_data.default_stage_id || ''));
        setStep(2); // Already set up, jump to script step
      } else {
        setToken(generateToken());
      }
    }).catch(() => { setToken(generateToken()); })
      .finally(() => setLoadingExisting(false));
  }, [isOpen]);

  const handleSaveAndContinue = async () => {
    setSaving(true);
    try {
      const payload = {
        provider: 'sheets',
        is_connected: true,
        config_data: {
          import_token: token,
          default_stage_id: defaultStageId ? parseInt(defaultStageId) : null,
        }
      };

      // Check if exists
      const r = await api.get('integrations/');
      const existing = (r.data || []).find(i => i.provider === 'sheets');

      if (existing) {
        await api.patch(`integrations/${existing.id}/`, payload);
      } else {
        await api.post('integrations/', payload);
      }

      onRefresh && onRefresh();
      setStep(2);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleCopyToken = () => {
    navigator.clipboard.writeText(token);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(getAppsScript());
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  const handleRegenToken = () => {
    setToken(generateToken());
  };

  const handleTestEndpoint = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`${CRM_ENDPOINT}`, { method: 'GET' });
      const json = await res.json();
      setTestResult({ ok: true, message: json.message || 'Endpoint is reachable ✓' });
    } catch {
      setTestResult({ ok: false, message: 'Cannot reach endpoint. Check server is running.' });
    } finally {
      setTesting(false);
    }
  };

  const getAppsScript = () => `// ══════════════════════════════════════════════════════════════
// GEOCRM — Google Sheets Auto-Import Script
// Generated automatically — paste into your Google Sheet
// Extensions → Apps Script → paste → Save → Add Trigger
// ══════════════════════════════════════════════════════════════

const CRM_ENDPOINT = "${CRM_ENDPOINT}";
const IMPORT_TOKEN  = "${token}";
const HEADER_ROW    = 1; // Row number of your column headers

function importNewRowToCRM(e) {
  const sheet  = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= HEADER_ROW) return;

  const headers = sheet.getRange(HEADER_ROW, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row     = sheet.getRange(lastRow, 1, 1, sheet.getLastColumn()).getValues()[0];

  // Skip if Name is empty
  if (!row[0]) return;

  // Build payload from headers and values
  const payload = {};
  headers.forEach((h, i) => {
    if (h && row[i] !== undefined && row[i] !== '') {
      payload[String(h).trim()] = String(row[i]).trim();
    }
  });

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: { 'X-Import-Token': IMPORT_TOKEN },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(CRM_ENDPOINT, options);
    const result   = JSON.parse(response.getContentText());

    // Write status to last column
    const statusCol = headers.length + 1;
    const statusMsg = result.status === 'created'
      ? '✅ Imported • ' + new Date().toLocaleString()
      : result.status === 'duplicate'
        ? '⚠️ Duplicate'
        : '❌ ' + (result.error || result.status);

    sheet.getRange(lastRow, statusCol).setValue(statusMsg);

  } catch (err) {
    const statusCol = headers.length + 1;
    sheet.getRange(lastRow, statusCol).setValue('❌ Error: ' + err.message);
  }
}

// ── How to set up the trigger ──────────────────────────────────
// 1. In Apps Script, click ⏰ Triggers (left sidebar clock icon)
// 2. Click "+ Add Trigger"  
// 3. Choose function: importNewRowToCRM
// 4. Event source: Spreadsheet
// 5. Event type: On change
// 6. Save
// ──────────────────────────────────────────────────────────────`;

  const selectedStage = stages.find(s => String(s.id) === String(defaultStageId));

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div style={{
        position: 'fixed', inset: 0,
        background: 'rgba(15,23,42,0.6)',
        backdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px'
      }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          style={{
            background: '#ffffff',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '620px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 32px 64px -12px rgba(0,0,0,0.25)',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '28px 32px 24px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            position: 'sticky', top: 0, background: '#fff', zIndex: 10, borderRadius: '20px 20px 0 0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '14px',
                background: 'linear-gradient(135deg, #0f9d5815, #0f9d5830)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#0f9d58'
              }}>
                <FileSpreadsheet size={24} />
              </div>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>Google Sheets Integration</h2>
                <p style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>Auto-import Meta Ads leads into CRM</p>
              </div>
            </div>
            <button onClick={onClose} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px', cursor: 'pointer', color: '#64748b' }}>
              <X size={18} />
            </button>
          </div>

          {/* Step Indicator */}
          <div style={{ padding: '20px 32px 0', display: 'flex', gap: '8px', alignItems: 'center' }}>
            {['Setup', 'Apps Script', 'Done'].map((label, i) => {
              const stepNum = i + 1;
              const isActive = step === stepNum;
              const isDone = step > stepNum;
              return (
                <React.Fragment key={stepNum}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '50%',
                      background: isDone ? '#10b981' : isActive ? '#0f9d58' : '#e2e8f0',
                      color: isDone || isActive ? '#fff' : '#94a3b8',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '12px', fontWeight: '700', transition: 'all 0.2s'
                    }}>
                      {isDone ? <Check size={14} /> : stepNum}
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: isActive ? '700' : '500', color: isActive ? '#0f172a' : '#94a3b8' }}>{label}</span>
                  </div>
                  {i < 2 && <div style={{ flex: 1, height: '1px', background: step > stepNum + 1 ? '#10b981' : '#e2e8f0' }} />}
                </React.Fragment>
              );
            })}
          </div>

          {/* Body */}
          <div style={{ padding: '24px 32px 32px' }}>

            {/* ── STEP 1: Setup ─────────────────────────────────────────── */}
            {step === 1 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                {/* Import Token */}
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>
                    <Shield size={14} color="#0f9d58" />
                    Import Token (Secret Key)
                  </label>
                  <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px' }}>
                    This token authenticates your Google Sheet to the CRM. Keep it secret.
                  </p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{
                      flex: 1, padding: '10px 14px',
                      background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px',
                      fontFamily: 'monospace', fontSize: '12px', color: '#475569',
                      wordBreak: 'break-all', lineHeight: '1.5'
                    }}>
                      {token}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <button onClick={handleCopyToken} style={{
                        padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0',
                        background: copiedToken ? '#10b981' : '#f8fafc', color: copiedToken ? '#fff' : '#475569',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
                      }}>
                        {copiedToken ? <Check size={16} /> : <Copy size={16} />}
                      </button>
                      <button onClick={handleRegenToken} title="Regenerate token" style={{
                        padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0',
                        background: '#f8fafc', color: '#475569', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <RefreshCw size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Default Stage */}
                <div style={{ marginBottom: '28px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>
                    <Zap size={14} color="#0f9d58" />
                    Default Stage for Imported Leads
                  </label>
                  <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px' }}>
                    All leads from the sheet will start in this stage.
                  </p>
                  <select
                    value={defaultStageId}
                    onChange={e => setDefaultStageId(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: '10px',
                      border: '1px solid #e2e8f0', background: '#f8fafc',
                      fontSize: '14px', color: '#0f172a', outline: 'none'
                    }}
                  >
                    {stages.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Column Mapping Info */}
                <div style={{
                  background: '#f0fdf4', border: '1px solid #bbf7d0',
                  borderRadius: '12px', padding: '16px', marginBottom: '28px'
                }}>
                  <p style={{ fontSize: '13px', fontWeight: '700', color: '#166534', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Info size={14} /> Column Mapping (Auto-configured)
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {[
                      ['Name', 'Lead Name', 'required'],
                      ['District', 'Custom Field: District', ''],
                      ['Qualification', 'Custom Field: Qualification', ''],
                      ['Age', 'Custom Field: Age', ''],
                      ['Feedback 1', 'Activity Note (Initial Call)', ''],
                      ['Feedback 2', 'Activity Note (Follow-up)', ''],
                      ['Final Feedback', 'Activity Note (Final)', ''],
                    ].map(([col, target, badge]) => (
                      <div key={col} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                        <span style={{ fontWeight: '600', color: '#166534', minWidth: '130px' }}>{col}</span>
                        <ArrowRight size={12} color="#22c55e" />
                        <span style={{ color: '#374151' }}>{target}</span>
                        {badge && <span style={{ fontSize: '10px', background: '#fef3c7', color: '#92400e', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>{badge}</span>}
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleSaveAndContinue}
                  disabled={saving}
                  style={{
                    width: '100%', padding: '14px',
                    background: '#0f9d58', color: '#fff',
                    border: 'none', borderRadius: '12px',
                    fontSize: '15px', fontWeight: '700', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    opacity: saving ? 0.7 : 1, transition: 'all 0.2s'
                  }}
                >
                  {saving ? 'Saving...' : <>Save & Get Apps Script <ChevronRight size={18} /></>}
                </button>
              </motion.div>
            )}

            {/* ── STEP 2: Apps Script ───────────────────────────────────── */}
            {step === 2 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <div style={{
                  background: '#f0fdf4', border: '1px solid #bbf7d0',
                  borderRadius: '12px', padding: '16px', marginBottom: '20px',
                  display: 'flex', alignItems: 'flex-start', gap: '12px'
                }}>
                  <CheckCircle2 size={20} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: '700', color: '#166534' }}>Integration configured!</p>
                    <p style={{ fontSize: '12px', color: '#4d7c0f', marginTop: '2px' }}>
                      Now paste this script into your Google Sheet to start auto-importing leads.
                    </p>
                  </div>
                </div>

                {/* Instructions */}
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', marginBottom: '10px' }}>How to set up:</p>
                  {[
                    'Open your Google Sheet',
                    'Click Extensions → Apps Script',
                    'Delete any existing code, paste the script below',
                    'Click 💾 Save',
                    'Click ⏰ Triggers → Add Trigger → select importNewRowToCRM → On change → Save',
                  ].map((step, i) => (
                    <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '8px', alignItems: 'flex-start' }}>
                      <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#0f9d58', color: '#fff', fontSize: '11px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>{i + 1}</div>
                      <span style={{ fontSize: '13px', color: '#374151', lineHeight: '1.5' }}>{step}</span>
                    </div>
                  ))}
                </div>

                {/* Script Code */}
                <div style={{ position: 'relative', marginBottom: '20px' }}>
                  <pre style={{
                    background: '#0f172a', color: '#e2e8f0',
                    borderRadius: '12px', padding: '20px',
                    fontSize: '11px', lineHeight: '1.7',
                    overflowX: 'auto', maxHeight: '260px', overflowY: 'auto',
                    fontFamily: 'monospace', whiteSpace: 'pre'
                  }}>
                    {getAppsScript()}
                  </pre>
                  <button
                    onClick={handleCopyScript}
                    style={{
                      position: 'absolute', top: '12px', right: '12px',
                      background: copiedScript ? '#10b981' : 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: '#fff', borderRadius: '8px',
                      padding: '6px 12px', fontSize: '12px', fontWeight: '600',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                      transition: 'all 0.2s'
                    }}
                  >
                    {copiedScript ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy Script</>}
                  </button>
                </div>

                {/* Test Endpoint */}
                <div style={{ marginBottom: '20px' }}>
                  <button
                    onClick={handleTestEndpoint}
                    disabled={testing}
                    style={{
                      width: '100%', padding: '11px',
                      background: '#f8fafc', border: '1px solid #e2e8f0',
                      borderRadius: '10px', fontSize: '13px', fontWeight: '600',
                      cursor: 'pointer', color: '#475569',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                    }}
                  >
                    <Zap size={15} /> {testing ? 'Testing...' : 'Test Endpoint Connection'}
                  </button>
                  {testResult && (
                    <div style={{
                      marginTop: '8px', padding: '10px 14px', borderRadius: '8px',
                      background: testResult.ok ? '#f0fdf4' : '#fef2f2',
                      border: `1px solid ${testResult.ok ? '#bbf7d0' : '#fecaca'}`,
                      fontSize: '13px', color: testResult.ok ? '#166534' : '#dc2626',
                      display: 'flex', alignItems: 'center', gap: '8px'
                    }}>
                      {testResult.ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                      {testResult.message}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => setStep(1)}
                    style={{
                      flex: 1, padding: '12px',
                      background: '#f8fafc', border: '1px solid #e2e8f0',
                      borderRadius: '10px', fontSize: '14px', fontWeight: '600',
                      cursor: 'pointer', color: '#475569'
                    }}
                  >
                    ← Edit Settings
                  </button>
                  <button
                    onClick={() => { setStep(3); setTimeout(onClose, 1800); }}
                    style={{
                      flex: 2, padding: '12px',
                      background: '#0f9d58', color: '#fff',
                      border: 'none', borderRadius: '10px',
                      fontSize: '14px', fontWeight: '700', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                    }}
                  >
                    All Done! ✓
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── STEP 3: Done ──────────────────────────────────────────── */}
            {step === 3 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ textAlign: 'center', padding: '20px 0' }}
              >
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎉</div>
                <h3 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>Integration Active!</h3>
                <p style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.6' }}>
                  Your Google Sheet is now connected to GEOCRM.<br />
                  New Meta Ad leads will automatically appear in CRM.
                </p>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default GoogleSheetsModal;
