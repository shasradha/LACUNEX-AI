// Judge0 is proxied through our backend for security
// Never call Judge0 directly from frontend

export const JUDGE0_CONFIG = {
  // Our backend proxy (preferred — hides API keys)
  PROXY_URL: '/api/execute',
}

export const STATUS = {
  1: { label: 'In Queue', color: '#888', icon: '⏳' },
  2: { label: 'Processing', color: '#00d4ff', icon: '⚙️' },
  3: { label: 'Accepted', color: '#00c951', icon: '✅' },
  4: { label: 'Wrong Answer', color: '#ff6b6b', icon: '❌' },
  5: { label: 'Time Limit Exceeded', color: '#ff9900', icon: '⏱️' },
  6: { label: 'Compilation Error', color: '#ff6b6b', icon: '🔴' },
  7: { label: 'Runtime Error (SIGSEGV)', color: '#ff6b6b', icon: '💥' },
  8: { label: 'Runtime Error (SIGXFSZ)', color: '#ff6b6b', icon: '💥' },
  9: { label: 'Runtime Error (SIGFPE)', color: '#ff6b6b', icon: '💥' },
  10: { label: 'Runtime Error (SIGABRT)', color: '#ff6b6b', icon: '💥' },
  11: { label: 'Runtime Error (NZEC)', color: '#ff6b6b', icon: '💥' },
  12: { label: 'Runtime Error (Other)', color: '#ff6b6b', icon: '💥' },
  13: { label: 'Internal Error', color: '#ff6b6b', icon: '⚠️' },
  14: { label: 'Exec Format Error', color: '#ff6b6b', icon: '⚠️' },
}
