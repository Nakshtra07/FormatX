import { useGoogleLogin } from '@react-oauth/google'
import { FileText, Shield, Sparkles } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function Landing({ onLogin }) {

    const googleLogin = useGoogleLogin({
        onSuccess: async (response) => {
            try {
                // Exchange auth code for tokens via backend
                const tokenResponse = await fetch(`${API_URL}/auth/google/token`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        code: response.code,
                        redirect_uri: window.location.origin
                    }),
                })

                if (!tokenResponse.ok) {
                    throw new Error('Failed to exchange token')
                }

                const tokens = await tokenResponse.json()

                // Get user info
                const userResponse = await fetch(
                    `${API_URL}/auth/google/userinfo?access_token=${tokens.access_token}`
                )

                if (!userResponse.ok) {
                    throw new Error('Failed to get user info')
                }

                const user = await userResponse.json()
                onLogin(user, tokens.access_token)

            } catch (error) {
                console.error('Login error:', error)
                alert('Login failed. Please try again.')
            }
        },
        onError: (error) => {
            console.error('Google login error:', error)
            alert('Google login failed. Please try again.')
        },
        flow: 'auth-code',
        scope: 'openid email profile https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/drive.file',
    })

    return (
        <div className="auth-page">
            {/* Aurora animated background */}
            <div className="aurora-bg"></div>

            {/* Auth Card */}
            <div className="auth-wrapper animate-fadeIn">
                {/* Logo */}
                <div className="auth-logo">
                    <img src="/logo.png" alt="FormatX Logo" style={{ height: '80px', width: 'auto', marginBottom: '1rem' }} />
                </div>

                <h1>Welcome Back</h1>
                <p className="auth-subtitle">Sign in to format your documents with AI</p>

                {/* Google Sign In Button */}
                <button className="btn-google-auth" onClick={() => googleLogin()}>
                    <svg width="20" height="20" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                </button>

                {/* Divider */}
                <div className="auth-divider">
                    <span>Secure OAuth Login</span>
                </div>

                {/* Features */}
                <div className="auth-features">
                    <div className="auth-feature">
                        <span className="auth-feature-icon"><FileText size={24} /></span>
                        <span>Google Docs Integration</span>
                    </div>
                    <div className="auth-feature">
                        <span className="auth-feature-icon"><Shield size={24} /></span>
                        <span>No Data Stored</span>
                    </div>
                    <div className="auth-feature">
                        <span className="auth-feature-icon"><Sparkles size={24} /></span>
                        <span>Free to Use</span>
                    </div>
                </div>

                {/* Back to landing link */}
                <a href="/" className="auth-back-link">
                    ← Back to FormatX.com
                </a>
            </div>
        </div>
    )
}

export default Landing
