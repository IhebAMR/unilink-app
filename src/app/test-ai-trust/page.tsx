'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/app/components/ui/Button';
import Card from '@/app/components/ui/Card';
import Badge from '@/app/components/ui/Badge';
import PageSection from '@/app/components/ui/PageSection';
import BackButton from '@/app/components/BackButton';

export default function TestAITrustPage() {
  const router = useRouter();
  const [userId, setUserId] = React.useState<string>('');
  const [loading, setLoading] = React.useState(false);
  const [trustScore, setTrustScore] = React.useState<any>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [currentUser, setCurrentUser] = React.useState<any>(null);

  // Get current user on mount
  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/me', { credentials: 'include' });
        if (res.ok) {
          const user = await res.json();
          setCurrentUser(user);
          setUserId(user._id || '');
        }
      } catch (err) {
        console.error('Failed to get current user', err);
      }
    })();
  }, []);

  const handleTest = async () => {
    if (!userId) {
      setError('Please enter a user ID');
      return;
    }

    setLoading(true);
    setError(null);
    setTrustScore(null);

    try {
      const res = await fetch(`/api/ai/user-trust-score/${userId}`, {
        credentials: 'include'
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to get trust score');
      }

      const data = await res.json();
      setTrustScore(data);
    } catch (err: any) {
      setError(err.message || 'Failed to calculate trust score');
      console.error('Trust score error', err);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#16a34a'; // green
    if (score >= 65) return '#3b82f6'; // blue
    if (score >= 50) return '#f59e0b'; // yellow
    if (score >= 30) return '#ef4444'; // red
    return '#6b7280'; // gray
  };

  const getLevelBadge = (level: string) => {
    const variants: Record<string, 'success' | 'primary' | 'warning' | 'danger' | 'neutral'> = {
      excellent: 'success',
      good: 'primary',
      fair: 'warning',
      poor: 'danger',
      new: 'neutral'
    };
    return <Badge variant={variants[level] || 'neutral'}>{level.toUpperCase()}</Badge>;
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 16 }}>
      <BackButton label="Back" href="/" />
      
      <PageSection style={{ marginTop: 12 }}>
        <h1 style={{ margin: '0 0 8px 0', fontSize: '1.8rem' }}>
          🤖 AI Trust Score Tester
        </h1>
        <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
          Test the AI-powered user trust scoring system
        </p>
      </PageSection>

      <PageSection style={{ marginTop: 24 }}>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="userId" style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
            User ID to Test:
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              id="userId"
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Enter user ID or use current user"
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: 6,
                border: '1px solid #ddd',
                fontSize: '16px'
              }}
            />
            {currentUser && (
              <Button
                onClick={() => setUserId(currentUser._id)}
                variant="outline"
                size="sm"
              >
                Use My ID
              </Button>
            )}
          </div>
          {currentUser && (
            <div style={{ marginTop: 8, fontSize: '0.85rem', color: '#666' }}>
              Current user: {currentUser.name} ({currentUser.email})
            </div>
          )}
        </div>

        <Button
          onClick={handleTest}
          disabled={loading || !userId}
          variant="primary"
          style={{ width: '100%' }}
        >
          {loading ? 'Calculating...' : 'Calculate Trust Score'}
        </Button>

        {error && (
          <Card style={{ marginTop: 16, padding: 16, backgroundColor: '#fee2e2', borderColor: '#ef4444' }}>
            <div style={{ color: '#dc2626', fontWeight: 600 }}>Error:</div>
            <div style={{ color: '#991b1b', marginTop: 4 }}>{error}</div>
          </Card>
        )}
      </PageSection>

      {trustScore && (
        <PageSection style={{ marginTop: 24 }}>
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '1.3rem' }}>Trust Score Results</h2>
          </div>

          {/* Overall Score */}
          <Card style={{ marginBottom: 16, border: `3px solid ${getScoreColor(trustScore.score)}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: 4 }}>Overall Trust Score</div>
                <div style={{ fontSize: '3rem', fontWeight: 'bold', color: getScoreColor(trustScore.score) }}>
                  {trustScore.score}
                </div>
                <div style={{ fontSize: '1.2rem', color: '#666' }}>/ 100</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: 8 }}>Trust Level</div>
                {getLevelBadge(trustScore.level)}
              </div>
            </div>
          </Card>

          {/* Score Breakdown */}
          <Card style={{ marginBottom: 16 }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem' }}>Score Breakdown</h3>
            <div style={{ display: 'grid', gap: 12 }}>
              {Object.entries(trustScore.breakdown).map(([key, value]: [string, any]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 500, textTransform: 'capitalize' }}>
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#666', marginTop: 2 }}>
                      {key === 'reviews' && 'Based on user ratings (40% weight)'}
                      {key === 'activity' && 'Based on completed rides (20% weight)'}
                      {key === 'accountAge' && 'Based on account age (10% weight)'}
                      {key === 'verification' && 'Based on verification status (15% weight)'}
                      {key === 'behavior' && 'Based on cancellation/reliability (15% weight)'}
                    </div>
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: getScoreColor(value) }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Factors */}
          {trustScore.factors && trustScore.factors.length > 0 && (
            <Card style={{ marginBottom: 16 }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem' }}>Key Factors</h3>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {trustScore.factors.map((factor: string, index: number) => (
                  <li key={index} style={{ marginBottom: 8, color: '#333' }}>
                    {factor}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Recommendations */}
          {trustScore.recommendations && trustScore.recommendations.length > 0 && (
            <Card style={{ backgroundColor: '#f0f9ff', borderColor: '#3b82f6' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', color: '#1e40af' }}>
                💡 Recommendations to Improve Trust Score
              </h3>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {trustScore.recommendations.map((rec: string, index: number) => (
                  <li key={index} style={{ marginBottom: 8, color: '#1e3a8a' }}>
                    {rec}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Raw Data */}
          <details style={{ marginTop: 16 }}>
            <summary style={{ cursor: 'pointer', padding: 12, backgroundColor: '#f9fafb', borderRadius: 6, fontWeight: 500 }}>
              View Raw Data
            </summary>
            <Card style={{ marginTop: 8 }}>
              <pre style={{ 
                margin: 0, 
                padding: 12, 
                backgroundColor: '#f9fafb', 
                borderRadius: 6, 
                overflow: 'auto',
                fontSize: '0.85rem'
              }}>
                {JSON.stringify(trustScore, null, 2)}
              </pre>
            </Card>
          </details>
        </PageSection>
      )}
    </div>
  );
}




