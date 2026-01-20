import Head from 'next/head'
import Terminal from '../components/Terminal'

export default function Home() {
  return (
    <>
      <Head>
        <title>AI Kanban Terminal</title>
        <meta name="description" content="Browser-based terminal with bidirectional shell" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main>
        <Terminal />
      </main>
    </>
  )
}
