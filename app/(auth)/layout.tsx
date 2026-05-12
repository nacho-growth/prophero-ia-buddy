import Image from 'next/image'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const agentName = process.env.NEXT_PUBLIC_AGENT_NAME ?? 'PropHero IA Buddy'

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
      <div className="mb-8 flex flex-col items-center gap-2">
        <Image
          src="/buddy.png"
          width={80}
          height={80}
          alt="PropHero IA Buddy"
          loading="eager"
          className="w-20 h-20 object-contain"
        />
        <span className="text-white text-xl font-semibold tracking-tight">{agentName}</span>
      </div>
      {children}
    </div>
  )
}
