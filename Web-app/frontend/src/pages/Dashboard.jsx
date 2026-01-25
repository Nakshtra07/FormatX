import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
    FileText, Upload, Sparkles, Lightbulb, Trash2, Star,
    CheckCircle, AlertCircle, Loader2, Plus, X, Crown
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function Dashboard({ user, accessToken, onLogout }) {
    const [docUrl, setDocUrl] = useState('')
    const [selectedTemplate, setSelectedTemplate] = useState('ieee_research_paper')
    const [templates, setTemplates] = useState([])
    const [customTemplates, setCustomTemplates] = useState([])
    const [status, setStatus] = useState({ type: '', message: '' })
    const [isLoading, setIsLoading] = useState(false)
    const [docInfo, setDocInfo] = useState(null)
    const [showTemplateUpload, setShowTemplateUpload] = useState(false)
    const [uploadStatus, setUploadStatus] = useState({ type: '', message: '' })
    const [isUploading, setIsUploading] = useState(false)
    const fileInputRef = useRef(null)
    const [templateName, setTemplateName] = useState('')

    // Fetch available templates on mount
    useEffect(() => {
        fetchTemplates()
        fetchCustomTemplates()
    }, [accessToken])

    const fetchTemplates = async () => {
        try {
            const response = await fetch(`${API_URL}/documents/templates`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            })
            if (response.ok) {
                const data = await response.json()
                // Separate built-in from custom templates
                const builtIn = data.templates.filter(t => !t.is_custom)
                setTemplates(builtIn)
            }
        } catch (error) {
            console.error('Failed to fetch templates:', error)
            // Use default templates if API fails
            setTemplates([
                { id: 'ieee_research_paper', name: 'IEEE Research Paper', description: 'IEEE-compliant academic research paper format' },
                { id: 'meeting_minutes', name: 'Minutes of Meeting', description: 'Professional corporate meeting minutes' },
                { id: 'business_proposal', name: 'Business Proposal', description: 'Professional client proposal format' },
            ])
        }
    }

    const fetchCustomTemplates = async () => {
        try {
            const response = await fetch(`${API_URL}/templates/custom/list`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            })
            if (response.ok) {
                const data = await response.json()
                setCustomTemplates(data.templates)
            }
        } catch (error) {
            console.error('Failed to fetch custom templates:', error)
        }
    }

    const handleUrlChange = async (url) => {
        setDocUrl(url)
        setDocInfo(null)
        setStatus({ type: '', message: '' })

        // Try to fetch document info when URL looks valid
        if (url.includes('docs.google.com/document')) {
            try {
                const response = await fetch(
                    `${API_URL}/documents/info?doc_url=${encodeURIComponent(url)}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${accessToken}`
                        }
                    }
                )

                if (response.ok) {
                    const info = await response.json()
                    setDocInfo(info)
                }
            } catch (error) {
                // Silently fail - user can still try to format
            }
        }
    }

    const handleFormat = async () => {
        if (!docUrl) {
            setStatus({ type: 'error', message: 'Please enter a Google Docs URL' })
            return
        }

        setIsLoading(true)
        setStatus({ type: 'loading', message: 'Formatting your document... This may take a moment.' })

        try {
            const response = await fetch(`${API_URL}/documents/format`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({
                    doc_url: docUrl,
                    template_id: selectedTemplate,
                    preview_only: false
                })
            })

            const result = await response.json()

            if (response.ok && result.success) {
                setStatus({
                    type: 'success',
                    message: <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} /> Document formatted! Detected sections: {result.sections_detected.join(', ')}</span>
                })
            } else {
                setStatus({
                    type: 'error',
                    message: result.detail || 'Failed to format document. Please try again.'
                })
            }
        } catch (error) {
            setStatus({
                type: 'error',
                message: 'Network error. Please check your connection and try again.'
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleTemplateUpload = async (e) => {
        e.preventDefault()

        const file = fileInputRef.current?.files[0]
        if (!file) {
            setUploadStatus({ type: 'error', message: 'Please select a file' })
            return
        }

        if (!templateName.trim()) {
            setUploadStatus({ type: 'error', message: 'Please enter a template name' })
            return
        }

        // Validate file type
        const validTypes = ['.docx', '.pdf']
        const fileExt = file.name.toLowerCase().slice(file.name.lastIndexOf('.'))
        if (!validTypes.includes(fileExt)) {
            setUploadStatus({ type: 'error', message: 'Only .docx and .pdf files are supported' })
            return
        }

        // Validate file size (10MB max)
        if (file.size > 10 * 1024 * 1024) {
            setUploadStatus({ type: 'error', message: 'File size must be less than 10MB' })
            return
        }

        setIsUploading(true)
        setUploadStatus({ type: 'loading', message: 'Uploading and analyzing document...' })

        try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('template_name', templateName.trim())

            const response = await fetch(`${API_URL}/templates/custom/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                },
                body: formData
            })

            const result = await response.json()

            if (response.ok) {
                setUploadStatus({
                    type: 'success',
                    message: <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} /> Template "{result.name}" created with {result.sections_detected} headers!</span>
                })
                // Refresh custom templates list
                fetchCustomTemplates()
                // Reset form
                setTemplateName('')
                if (fileInputRef.current) fileInputRef.current.value = ''
                // Auto-close after success
                setTimeout(() => {
                    setShowTemplateUpload(false)
                    setUploadStatus({ type: '', message: '' })
                }, 2000)
            } else {
                setUploadStatus({
                    type: 'error',
                    message: result.detail || 'Failed to create template'
                })
            }
        } catch (error) {
            setUploadStatus({
                type: 'error',
                message: 'Network error. Please try again.'
            })
        } finally {
            setIsUploading(false)
        }
    }

    const handleDeleteTemplate = async (templateId) => {
        if (!confirm('Are you sure you want to delete this template?')) return

        try {
            const response = await fetch(`${API_URL}/templates/custom/${templateId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            })

            if (response.ok) {
                // Refresh list and reset selection if needed
                fetchCustomTemplates()
                if (selectedTemplate === templateId) {
                    setSelectedTemplate('ieee_research_paper')
                }
            }
        } catch (error) {
            console.error('Failed to delete template:', error)
        }
    }

    return (
        <div className="dashboard">
            {/* Navbar */}
            <nav className="navbar">
                <div className="container navbar-content">
                    <div className="navbar-brand">
                        <img src="/logo.png" alt="Amarika" style={{ height: '40px', width: 'auto', marginRight: '0.75rem' }} />
                        Amarika
                    </div>
                    <div className="navbar-user">
                        <Link to="/pricing" className="btn btn-secondary" style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}>
                            <Crown size={14} style={{ marginRight: '4px' }} />
                            Upgrade
                        </Link>
                        <span style={{ color: 'var(--gray-300)' }}>
                            {user.name || user.email}
                        </span>
                        {user.picture && (
                            <img src={user.picture} alt="" className="user-avatar" />
                        )}
                        <button className="btn btn-secondary" onClick={onLogout}>
                            Logout
                        </button>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="dashboard-content">
                <header className="dashboard-header animate-fadeIn">
                    <h1 className="dashboard-title">Format Your Document</h1>
                    <p className="dashboard-subtitle">
                        Paste your Google Docs URL below and select a template to get started.
                    </p>
                </header>

                <div className="card format-form animate-fadeIn" style={{ animationDelay: '0.1s' }}>
                    {/* Document URL Input */}
                    <div className="input-group">
                        <label className="input-label" htmlFor="doc-url">
                            Google Docs URL
                        </label>
                        <input
                            id="doc-url"
                            type="url"
                            className="input"
                            placeholder="https://docs.google.com/document/d/..."
                            value={docUrl}
                            onChange={(e) => handleUrlChange(e.target.value)}
                            disabled={isLoading}
                        />
                        {docInfo && (
                            <p style={{ fontSize: '0.875rem', color: 'var(--primary-400)', marginTop: 'var(--space-2)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <FileText size={14} /> Found: "{docInfo.title}" ({docInfo.word_count} words)
                            </p>
                        )}
                    </div>

                    {/* Template Selection */}
                    <div className="input-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                            <label className="input-label" style={{ marginBottom: 0 }}>Select Template</label>
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowTemplateUpload(!showTemplateUpload)}
                                style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                            >
                                {showTemplateUpload ? <><X size={14} style={{ marginRight: 4 }} /> Close</> : <><Plus size={14} style={{ marginRight: 4 }} /> Create Custom Template</>}
                            </button>
                        </div>

                        {/* Custom Template Upload Form */}
                        {showTemplateUpload && (
                            <div className="card" style={{
                                marginBottom: 'var(--space-4)',
                                background: 'var(--color-bg-main)',
                                border: '2px dashed var(--color-cta)',
                                padding: 'var(--space-4)'
                            }}>
                                <h4 style={{ marginBottom: 'var(--space-3)', color: 'var(--color-cta)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Upload size={20} /> Create Template from Document
                                </h4>
                                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
                                    Upload a Word (.docx) or PDF file. The formatting (fonts, sizes, margins) will be extracted as a reusable template.
                                </p>
                                <form onSubmit={handleTemplateUpload}>
                                    <div className="input-group">
                                        <label className="input-label">Template Name</label>
                                        <input
                                            type="text"
                                            className="input"
                                            placeholder="My Custom Template"
                                            value={templateName}
                                            onChange={(e) => setTemplateName(e.target.value)}
                                            disabled={isUploading}
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label className="input-label">Source Document</label>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            accept=".docx,.pdf"
                                            className="input"
                                            disabled={isUploading}
                                            style={{ padding: '0.75rem' }}
                                        />
                                    </div>
                                    {uploadStatus.message && (
                                        <div className={`status status-${uploadStatus.type}`} style={{ marginBottom: 'var(--space-3)' }}>
                                            {uploadStatus.type === 'loading' && <div className="spinner"></div>}
                                            {uploadStatus.message}
                                        </div>
                                    )}
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={isUploading}
                                    >
                                        {isUploading ? <><Loader2 className="spinner-icon" size={16} /> Creating...</> : <><Sparkles size={16} style={{ marginRight: 8 }} /> Create Template</>}
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* Built-in Templates */}
                        <div className="template-select">
                            {templates.map((template) => (
                                <label key={template.id} className="template-option">
                                    <input
                                        type="radio"
                                        name="template"
                                        value={template.id}
                                        checked={selectedTemplate === template.id}
                                        onChange={(e) => setSelectedTemplate(e.target.value)}
                                        disabled={isLoading}
                                    />
                                    <div className="template-card">
                                        <div className="template-name">{template.name}</div>
                                        <div className="template-desc">{template.description}</div>
                                    </div>
                                </label>
                            ))}
                        </div>

                        {/* Custom Templates Section */}
                        {customTemplates.length > 0 && (
                            <>
                                <div style={{
                                    marginTop: 'var(--space-4)',
                                    marginBottom: 'var(--space-2)',
                                    color: 'var(--primary-400)',
                                    fontSize: '0.875rem',
                                    fontWeight: 500
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Star size={14} fill="currentColor" /> Your Custom Templates
                                    </div>
                                </div>
                                <div className="template-select">
                                    {customTemplates.map((template) => (
                                        <label key={template.id} className="template-option">
                                            <input
                                                type="radio"
                                                name="template"
                                                value={template.id}
                                                checked={selectedTemplate === template.id}
                                                onChange={(e) => setSelectedTemplate(e.target.value)}
                                                disabled={isLoading}
                                            />
                                            <div className="template-card" style={{ position: 'relative' }}>
                                                <div className="template-name">
                                                    {template.name}
                                                    <span style={{
                                                        fontSize: '0.7rem',
                                                        background: 'var(--primary-600)',
                                                        padding: '2px 6px',
                                                        borderRadius: '4px',
                                                        marginLeft: '8px'
                                                    }}>
                                                        Custom
                                                    </span>
                                                </div>
                                                <div className="template-desc">
                                                    Font: {template.font} • {template.sections_count} sections
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.preventDefault()
                                                        e.stopPropagation()
                                                        handleDeleteTemplate(template.id)
                                                    }}
                                                    style={{
                                                        position: 'absolute',
                                                        top: '8px',
                                                        right: '8px',
                                                        background: 'transparent',
                                                        border: 'none',
                                                        color: 'var(--gray-500)',
                                                        cursor: 'pointer',
                                                        fontSize: '1.2rem',
                                                        padding: '4px'
                                                    }}
                                                    title="Delete template"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Status Message */}
                    {status.message && (
                        <div className={`status status-${status.type}`}>
                            {status.type === 'loading' && <div className="spinner"></div>}
                            {status.message}
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        className="btn btn-primary btn-lg"
                        onClick={handleFormat}
                        disabled={isLoading || !docUrl}
                        style={{ width: '100%' }}
                    >
                        {isLoading ? (
                            <>
                                <div className="spinner"></div>
                                Formatting...
                            </>
                        ) : (
                            <>
                                <Sparkles size={20} style={{ marginRight: '8px' }} /> Format Document
                            </>
                        )}
                    </button>
                </div>

                {/* Instructions */}
                <div className="card" style={{ marginTop: 'var(--space-6)', animationDelay: '0.2s' }}>
                    <h3 style={{ marginBottom: 'var(--space-4)', color: 'var(--color-primary-dark)' }}>How it works</h3>
                    <ol style={{ paddingLeft: 'var(--space-6)', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                        <li>Open your Google Doc and copy the URL from the address bar</li>
                        <li>Paste the URL above and select your desired template</li>
                        <li>Click "Format Document" and wait for the AI to process</li>
                        <li>Your document will be automatically updated with proper formatting</li>
                    </ol>
                    <div className="pro-tip">
                        <strong style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Lightbulb size={16} /> Pro Tip:</strong>
                        <span>
                            Create custom templates by uploading your preferred document format!
                        </span>
                    </div>
                </div>
            </main>
        </div>
    )
}

export default Dashboard
