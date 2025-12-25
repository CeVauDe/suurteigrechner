import Head from 'next/head'
import Link from 'next/link'
import Calculator from './calculator'

export default function Home() {
  return (
    <>
      <Head>
        <title>Suurteigrechner</title>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <meta name="description" content="Alles was du brauchst für das perfekte Sauerteigbrot." />
      </Head>

      <div className="min-h-screen py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-6xl font-bold mb-6 text-center">Suurteigrechner</h1>
          <p className="text-slate-400 mb-8 text-center">Alles was du brauchst für das perfekte Sauerteigbrot.</p>

          {/* Calculator on home */}
          <div className="container-sm align-self-center">
            <Calculator />
          </div>
        </div>
      </div>
    </>
  )
}
