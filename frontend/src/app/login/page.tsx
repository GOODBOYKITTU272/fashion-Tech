'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const AUTHORIZED_EMAIL = 'pranaviyadav57@gmail.com'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpToken, setOtpToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Redirect if already logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email === AUTHORIZED_EMAIL) {
        router.replace('/')
      }
    })
  }, [router])

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    const normalizedEmail = email.trim().toLowerCase()

    // 1. Strict frontend authorization check
    if (normalizedEmail !== AUTHORIZED_EMAIL) {
      setErrorMsg('This private workspace is restricted to the authorized account.')
      return
    }

    setLoading(true)
    try {
      // 2. Call Supabase OTP without creating new users
      const { error } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          shouldCreateUser: false
        }
      })

      if (error) {
        throw error
      }

      setOtpSent(true)
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send login code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    const token = otpToken.trim()

    if (!token || token.length < 6) {
      setErrorMsg('Please enter the 6-digit verification code.')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: AUTHORIZED_EMAIL,
        token: token,
        type: 'email'
      })

      if (error) {
        throw error
      }

      if (data.session && data.user?.email === AUTHORIZED_EMAIL) {
        router.replace('/')
        router.refresh()
      } else {
        throw new Error('Verification succeeded but session email is unauthorized.')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid or expired verification code.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      color: 'var(--text)',
      padding: '1.5rem'
    }}>
      <div className="card card-pad" style={{
        width: '100%',
        maxWidth: '420px',
        borderColor: 'var(--border)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
            fontSize: '1.5rem',
            marginBottom: '1rem'
          }}>
            ⚡
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
            Pranavi CE
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', letterSpacing: '0.1em', marginTop: '0.25rem' }}>
            CODE × CRAFT × CONTEMPORARY DESIGN
          </p>
        </div>

        {/* Error Alert Banner */}
        {errorMsg && (
          <div className="card card-pad-sm" style={{
            background: 'var(--red-dim)',
            borderColor: 'rgba(248,113,113,0.4)',
            marginBottom: '1.5rem'
          }}>
            <p style={{ color: 'var(--red)', fontSize: '0.825rem', fontWeight: 500, margin: 0 }}>
              ⚠️ {errorMsg}
            </p>
          </div>
        )}

        {!otpSent ? (
          /* STEP 1: Enter Email */
          <form onSubmit={handleSendOtp}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                required
                className="form-input"
                placeholder="Enter authorized email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '1rem', justifyContent: 'center' }}
            >
              {loading ? 'Sending Code...' : 'Send Login Code'}
            </button>
          </form>
        ) : (
          /* STEP 2: Enter OTP Verification Code */
          <form onSubmit={handleVerifyOtp}>
            <div className="card card-pad-sm" style={{ background: 'rgba(255,255,255,0.03)', marginBottom: '1.25rem' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-2)', margin: 0 }}>
                Enter the verification code sent to <strong>{AUTHORIZED_EMAIL}</strong>
              </p>
            </div>
            <div className="form-group">
              <label className="form-label">One-Time Verification Code</label>
              <input
                type="text"
                required
                maxLength={6}
                className="form-input"
                placeholder="6-digit code"
                style={{ textAlign: 'center', fontSize: '1.25rem', letterSpacing: '0.3em', fontWeight: 700 }}
                value={otpToken}
                onChange={(e) => setOtpToken(e.target.value)}
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '1rem', justifyContent: 'center' }}
            >
              {loading ? 'Verifying...' : 'Verify & Sign In'}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ width: '100%', marginTop: '0.75rem', justifyContent: 'center', fontSize: '0.8rem' }}
              onClick={() => { setOtpSent(false); setOtpToken(''); setErrorMsg(null); }}
            >
              ← Back to email input
            </button>
          </form>
        )}

        <div style={{ marginTop: '2rem', textAlign: 'center', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', margin: 0 }}>
            🔒 Single-user passwordless OTP workspace
          </p>
        </div>
      </div>
    </div>
  )
}
