import Head from 'next/head'
import Link from 'next/link'

export default function FeedingPlanPlaceholder() {
  return (
    <>
      <Head>
        <title>Feeding Plan - Suurteigrechner</title>
      </Head>
      <div className="min-h-screen py-12 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-6xl font-bold mb-6">Feeding Plan</h1>
          <p className="text-slate-400 mb-6">This is a placeholder for the feeding plan component. Implementation coming soon.</p>
          <Link href="/">← Back to home</Link>
        </div>
      </div>
    </>
  )
}
