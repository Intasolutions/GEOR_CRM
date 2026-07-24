import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, FileSpreadsheet, ArrowRight, Check, AlertTriangle, 
  ArrowLeft, FileCheck, CheckCircle2, ShieldCheck, Database,
  AlertCircle, Download, Table
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import api from '../api/client';

const STEPS = [
  'Upload CSV',
  'Field Mapping',
  'Data Preview',
  'Duplicate Logic',
  'Final Import'
];

const ImportLeads = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [file, setFile] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [csvData, setCsvData] = useState([]);
  const [mapping, setMapping] = useState({});
  const [duplicateStrategy, setDuplicateStrategy] = useState('skip');

  useEffect(() => {
    // Restore from session storage if available
    const savedData = sessionStorage.getItem('import_csv_data');
    const savedHeaders = sessionStorage.getItem('import_csv_headers');
    const savedMapping = sessionStorage.getItem('import_mapping');
    if (savedData && savedHeaders) {
      setCsvData(JSON.parse(savedData));
      setHeaders(JSON.parse(savedHeaders));
      if (savedMapping) setMapping(JSON.parse(savedMapping));
    }
  }, []);
  const [systemFields, setSystemFields] = useState([
    { id: 'name', label: 'Lead Name', required: true },
    { id: 'email', label: 'Email Address', required: false },
    { id: 'phone', label: 'Phone Number', required: false },
    { id: 'company', label: 'Company Name', required: false },
    { id: 'lead_source', label: 'Lead Source', required: false }
  ]);
  const [importStatus, setImportStatus] = useState({ total: 0, completed: 0, skipped: 0, error_count: 0, errors: [] });
  const [loading, setLoading] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState('');

  useEffect(() => {
    // Fetch custom fields and campaigns
    Promise.all([
      api.get('custom-fields/'),
      api.get('campaigns/')
    ]).then(([res, campRes]) => {
      const customs = res.data.map(f => ({ id: `custom_${f.id}`, label: f.label, required: false }));
      setSystemFields(prev => [...prev.filter(f => !f.id.startsWith('custom_')), ...customs]);
      setCampaigns(campRes.data);
    });
  }, []);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) {
      setFile(f);
      Papa.parse(f, {
        header: true,
        skipEmptyLines: 'greedy',
        transformHeader: (header) => header.trim(), // Crucial for Excel exports
        complete: (results) => {
          if (results.meta && results.meta.fields && results.meta.fields.length > 0) {
            const cleanedHeaders = results.meta.fields.filter(h => h && h.trim().length > 0);
            setHeaders(cleanedHeaders);
            setCsvData(results.data);
            
            // Persist to session storage to avoid data loss on refresh
            sessionStorage.setItem('import_csv_data', JSON.stringify(results.data));
            sessionStorage.setItem('import_csv_headers', JSON.stringify(cleanedHeaders));
            
            // Intelligence: Try to auto-map based on common synonyms
            const initialMapping = {};
            systemFields.forEach(sf => {
              const label = sf.label.toLowerCase();
              const id = sf.id.toLowerCase();
              
              const match = cleanedHeaders.find(h => {
                const header = h.toLowerCase();
                return header === label || 
                       header === id || 
                       header.includes(id) || 
                       label.includes(header) ||
                       (id === 'name' && (header.includes('name') || header.includes('customer'))) ||
                       (id === 'email' && header.includes('mail')) ||
                       (id === 'phone' && (header.includes('phone') || header.includes('mobile') || header.includes('contact') || header === 'number'))
              });
              
              if (match) initialMapping[sf.id] = match;
            });
            setMapping(initialMapping);
            setCurrentStep(1);
          } else {
            alert("Unable to detect headers in this CSV. Please ensure the first row contains valid column labels.");
          }
        },
        error: (err) => {
          console.error("CSV Parse Error:", err);
          alert("Error reading file: " + err.message);
        }
      });
    }
  };

  const handleMappingChange = (sysFieldId, csvHeader) => {
    const newMapping = { ...mapping, [sysFieldId]: csvHeader };
    setMapping(newMapping);
    sessionStorage.setItem('import_mapping', JSON.stringify(newMapping));
  };

  const getMappedPreview = () => {
    return csvData.slice(0, 3).map(row => {
      const lead = {};
      Object.entries(mapping).forEach(([sysId, csvHeader]) => {
        if (csvHeader) lead[sysId] = row[csvHeader];
      });
      return lead;
    });
  };

  const startImport = async () => {
    setLoading(true);
    setCurrentStep(4);
    
    const mappedLeads = csvData.map(row => {
      const lead = { custom_data: {} };
      Object.entries(mapping).forEach(([sysId, csvHeader]) => {
        if (!csvHeader) return;
        
        if (sysId.startsWith('custom_')) {
          const actualFieldId = sysId.replace('custom_', '');
          lead.custom_data[actualFieldId] = row[csvHeader];
        } else {
          lead[sysId] = row[csvHeader];
        }
      });
      if (selectedCampaign) lead.campaign = selectedCampaign;
      return lead;
    });

    console.log('📦 Final Data Check:', {
      csvRows: csvData.length,
      mappedLeads: mappedLeads.length,
      sample: mappedLeads[0]
    });

    if (mappedLeads.length === 0) {
      toast.error('The CRM has no data to send! Please re-upload your CSV file.');
      setLoading(false);
      return;
    }

    try {
      const res = await api.post('leads/bulk_import/', {
        leads: mappedLeads,
        strategy: duplicateStrategy
      });
      
      console.log('✅ Server Response:', res.data);

      setImportStatus({
        total: mappedLeads.length,
        completed: res.data.created || 0,
        updated: res.data.updated || 0,
        skipped: res.data.skipped || 0,
        error_count: res.data.error_count || 0,
        errors: res.data.errors || []
      });
    } catch (err) {
      console.error('❌ Import Failed:', err);
      setImportStatus(prev => ({ ...prev, errors: [{ message: 'Import failed: Server error' }] }));
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const csvRows = systemFields.map(f => f.label).join(',');
    
    const blob = new Blob([csvRows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'crm_leads_template.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="page-container" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <button 
        onClick={() => navigate('/leads')}
        style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', color: 'var(--text-secondary)', marginBottom: '32px' }}
      >
        <ArrowLeft size={18} /> Exit Import
      </button>

      <section className="page-header-responsive" style={{ marginBottom: '40px' }}>
        <div>
          <h1 style={{ fontSize: '30px', fontWeight: '800', marginBottom: '8px' }}>Professional Import Engine</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Fulfilling BRD 7.5: Data mapping, validation and duplicate control.</p>
        </div>
      </section>

      {/* Modern Progress Steps */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '50px', position: 'relative', overflowX: 'auto', paddingBottom: '16px' }}>
        <div style={{ position: 'absolute', top: '15px', left: '20px', right: '20px', height: '2px', background: 'var(--border-color)', zIndex: 0 }}></div>
        {STEPS.map((step, idx) => (
          <div key={step} style={{ zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <div style={{ 
              width: '32px', 
              height: '32px', 
              borderRadius: '50%', 
              background: idx < currentStep ? 'var(--success)' : idx === currentStep ? 'var(--brand-blue)' : 'var(--bg-tertiary)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 'bold',
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
            }}>
              {idx < currentStep ? <Check size={16} /> : idx + 1}
            </div>
            <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: idx === currentStep ? 'var(--brand-blue)' : 'var(--text-secondary)' }}>{step}</span>
          </div>
        ))}
      </div>

      <div className="glass-card" style={{ padding: 'clamp(20px, 5vw, 40px)', minHeight: '440px', display: 'flex', flexDirection: 'column' }}>
        <AnimatePresence mode="wait">
          {currentStep === 0 && (
            <motion.div 
              key="s0"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              style={{ textAlign: 'center', margin: 'auto' }}
            >
              <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'rgba(30, 58, 138, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: 'var(--brand-blue)' }}>
                <FileSpreadsheet size={40} />
              </div>
              <h2 style={{ marginBottom: '12px' }}>Upload your Data Source</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>Pick a CSV file with headers. We'll handle the rest.</p>
              
              <div style={{ marginBottom: '32px', textAlign: 'left', maxWidth: '400px', margin: '0 auto 32px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>Target Campaign (Optional)</label>
                <select 
                  className="glass-input" 
                  value={selectedCampaign} 
                  onChange={e => setSelectedCampaign(e.target.value)}
                >
                  <option value="">-- No Campaign Association --</option>
                  {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>All imported leads will be tagged with this campaign.</p>
              </div>

              <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <label className="btn-primary" style={{ cursor: 'pointer', padding: '16px 32px' }}>
                  Select CSV File
                  <input type="file" style={{ display: 'none' }} accept=".csv" onChange={handleFileChange} />
                </label>
                <button className="btn-secondary" onClick={downloadTemplate} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Download size={18} /> Download Template
                </button>
              </div>
            </motion.div>
          )}

          {currentStep === 1 && (
            <motion.div key="s1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '20px' }}>Field Mapping</h2>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{Object.keys(mapping).length} of {systemFields.length} mapped</div>
              </div>
              
              <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '12px', marginBottom: '32px' }}>
                {systemFields.map(field => (
                  <div key={field.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(150px, 1.2fr) 1fr', alignItems: 'center', gap: '16px', padding: '16px 0', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '2px' }}>{field.label}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{field.required ? 'Mandatory Requirement' : 'Optional Inclusion'}</div>
                    </div>
                    <select 
                      className="glass-input" 
                      value={mapping[field.id] || ''}
                      onChange={(e) => handleMappingChange(field.id, e.target.value)}
                      style={{ border: field.required && !mapping[field.id] ? '1px solid var(--danger)' : '' }}
                    >
                      <option value="">-- Ignore this column --</option>
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              
              <div style={{ marginTop: 'auto', display: 'flex', gap: '12px' }}>
                <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setCurrentStep(0)}>Back</button>
                <button 
                  className="btn-primary" 
                  disabled={systemFields.some(f => f.required && !mapping[f.id])}
                  style={{ flex: 2, opacity: systemFields.some(f => f.required && !mapping[f.id]) ? 0.5 : 1 }}
                  onClick={() => setCurrentStep(2)}
                >
                  Verify Mapping Results
                </button>
              </div>
            </motion.div>
          )}

          {currentStep === 2 && (
            <motion.div key="s2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ width: '100%' }}>
               <h2 style={{ fontSize: '20px', marginBottom: '24px' }}>Mapping Preview (First 3 Rows)</h2>
               <div style={{ overflowX: 'auto', marginBottom: '32px' }}>
                <table className="data-table" style={{ fontSize: '12px' }}>
                  <thead>
                    <tr>
                      {Object.keys(mapping).filter(k => mapping[k]).map(k => (
                        <th key={k}>{systemFields.find(sf => sf.id === k)?.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {getMappedPreview().map((row, i) => (
                      <tr key={i}>
                        {Object.keys(mapping).filter(k => mapping[k]).map(k => (
                          <td key={k}>{row[k]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
               </div>
               <div style={{ display: 'flex', gap: '16px' }}>
                <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setCurrentStep(1)}>Revise Mapping</button>
                <button className="btn-primary" style={{ flex: 2 }} onClick={() => setCurrentStep(3)}>Duplicate Control</button>
               </div>
            </motion.div>
          )}

          {currentStep === 3 && (
            <motion.div key="s3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ width: '100%', textAlign: 'center' }}>
               <AlertTriangle size={48} color="var(--brand-blue)" style={{ marginBottom: '24px' }} />
               <h2 style={{ marginBottom: '12px' }}>Duplicate Resolution Strategy</h2>
               <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', fontWeight: 'bold' }}>
                 📦 {csvData.length} Leads detected and ready for processing.
               </p>
               
               <div className="grid-equal" style={{ gap: '20px', marginBottom: '40px' }}>
                <div 
                  onClick={() => setDuplicateStrategy('skip')}
                  style={{ 
                    padding: '24px', 
                    borderRadius: '16px', 
                    border: `2px solid ${duplicateStrategy === 'skip' ? 'var(--brand-blue)' : 'var(--border-color)'}`,
                    cursor: 'pointer',
                    textAlign: 'left',
                    background: duplicateStrategy === 'skip' ? 'rgba(30, 58, 138, 0.05)' : 'none'
                  }}
                >
                  <h4 style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>Skip Existing {duplicateStrategy === 'skip' && <Check size={18} />}</h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Identify duplicates by email and ignore them. Safest option.</p>
                </div>
                <div 
                   onClick={() => setDuplicateStrategy('overwrite')}
                   style={{ 
                    padding: '24px', 
                    borderRadius: '16px', 
                    border: `2px solid ${duplicateStrategy === 'overwrite' ? 'var(--brand-blue)' : 'var(--border-color)'}`,
                    cursor: 'pointer',
                    textAlign: 'left',
                    background: duplicateStrategy === 'overwrite' ? 'rgba(30, 58, 138, 0.05)' : 'none'
                  }}
                >
                  <h4 style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>Overwrite/Merge {duplicateStrategy === 'overwrite' && <Check size={18} />}</h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Update existing records with data from this file. Use with caution.</p>
                </div>
               </div>
               
               <button className="btn-primary" style={{ width: '100%', padding: '16px' }} onClick={startImport}>Execute Import Process</button>
            </motion.div>
          )}

          {currentStep === 4 && (
            <motion.div key="s4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ margin: 'auto', textAlign: 'center' }}>
               {loading ? (
                <>
                  <div className="loader" style={{ margin: '0 auto 24px' }}></div>
                  <h2>Processing Batch Data...</h2>
                  <p style={{ color: 'var(--text-secondary)' }}>This handles parsing, field transformation, and database persistence.</p>
                </>
               ) : (
                <>
                  <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: 'white' }}>
                    <CheckCircle2 size={40} />
                  </div>
                  <h2 style={{ marginBottom: '12px' }}>Batch Import Complete</h2>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '32px', marginBottom: '40px' }}>
                    <div>
                      <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--success)' }}>{importStatus.completed}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Created</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--brand-blue)' }}>{importStatus.updated || 0}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Updated</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '24px', fontWeight: '800' }}>{importStatus.skipped}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Skipped</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '24px', fontWeight: '800', color: importStatus.error_count > 0 ? 'var(--danger)' : 'inherit' }}>{importStatus.error_count}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Errors</div>
                    </div>
                  </div>

                  {importStatus.errors && importStatus.errors.length > 0 && (
                    <div style={{ textAlign: 'left', background: 'rgba(239, 68, 68, 0.05)', padding: '16px', borderRadius: '12px', marginBottom: '24px', maxHeight: '150px', overflowY: 'auto' }}>
                      <h4 style={{ fontSize: '13px', color: 'var(--danger)', marginBottom: '8px' }}>Error Details:</h4>
                      {importStatus.errors.slice(0, 5).map((err, i) => (
                        <div key={i} style={{ fontSize: '11px', marginBottom: '4px' }}>
                          Row Mapping: {JSON.stringify(err.errors)}
                        </div>
                      ))}
                      {importStatus.errors.length > 5 && <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>...and {importStatus.errors.length - 5} more errors</div>}
                    </div>
                  )}

                  <button className="btn-primary" style={{ padding: '14px 48px' }} onClick={() => navigate('/leads')}>View Imported Data</button>
                </>
               )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ImportLeads;
