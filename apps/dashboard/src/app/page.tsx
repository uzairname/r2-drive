import { redirect } from 'next/navigation'

// Token handling is done by middleware - it extracts ?token= and sets a cookie
// before this page even renders, so we just redirect to /explorer
export default function Page() {
  redirect('/explorer')
}
