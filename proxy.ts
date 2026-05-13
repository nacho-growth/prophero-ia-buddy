import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const ROLE_RANK: Record<string, number> = {
  employee: 0,
  manager: 1,
  hr_admin: 2,
  tenant_admin: 3,
  super_admin: 4,
}

function hasRole(role: string, minRole: string): boolean {
  return (ROLE_RANK[role] ?? -1) >= (ROLE_RANK[minRole] ?? 0)
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Bail immediately for auth routes — no Supabase calls, no possible redirect loop
  if (pathname.startsWith('/login') || pathname.startsWith('/signup')) {
    return NextResponse.next({ request })
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  // getSession() reads the cookie locally — no network call, sufficient for routing decisions
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (pathname.startsWith('/admin')) {
    const { data: profile } = await supabase
      .from('users')
      .select('role, tenant_id')
      .eq('id', session.user.id)
      .single()

    const role = profile?.role ?? 'employee'

    if (!hasRole(role, 'manager')) {
      const url = request.nextUrl.clone()
      url.pathname = '/app/home'
      return NextResponse.redirect(url)
    }

    if (pathname.startsWith('/admin/announcements') && !hasRole(role, 'hr_admin')) {
      const url = request.nextUrl.clone()
      url.pathname = '/app/home'
      return NextResponse.redirect(url)
    }

    if (
      (pathname.startsWith('/admin/skills') || pathname.startsWith('/admin/settings')) &&
      !hasRole(role, 'tenant_admin')
    ) {
      const url = request.nextUrl.clone()
      url.pathname = '/app/home'
      return NextResponse.redirect(url)
    }
  }

  return response
}
