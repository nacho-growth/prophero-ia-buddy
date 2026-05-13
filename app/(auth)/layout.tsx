export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const agentName = process.env.NEXT_PUBLIC_AGENT_NAME ?? 'PropHero IA Buddy'

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
      <div className="mb-8 flex flex-col items-center gap-2">
        <img
          src="/buddy.png"
          width={80}
          height={80}
          alt="PropHero IA Buddy"
          style={{ width: 80, height: 80, objectFit: 'contain', borderRadius: 12 }}
        />
        <span className="text-white text-xl font-semibold tracking-tight">{agentName}</span>
      </div>
      {children}
    </div>
  )
}
