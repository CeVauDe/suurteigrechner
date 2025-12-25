import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'

const links = [
    { href: '/', label: 'Suurteigrechner' },
    { href: '/guestbook', label: 'Gästebuech' },
    { href: '/feedingplan', label: 'Füertterigsplan' }
]

export default function Nav() {
    const router = useRouter();
    const menuRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const handleRoute = () => {
            const el = menuRef.current;
            const bs = (window as any).bootstrap;
            if (el && bs && bs.Collapse) {
                const inst = bs.Collapse.getInstance(el);
                if (inst) inst.hide();
                else {
                    // create and hide if not present
                    const created = bs.Collapse.getOrCreateInstance ? bs.Collapse.getOrCreateInstance(el, { toggle: false }) : new bs.Collapse(el, { toggle: false });
                    if (created && created.hide) created.hide();
                }
            }
        };
        router.events.on('routeChangeStart', handleRoute);
        return () => router.events.off('routeChangeStart', handleRoute);
    }, [router.events]);
    return (
        <header>
            <nav className="navbar navbar-expand-lg navbar-light bg-light">
                <div className="container-fluid">
                    <a className="navbar-brand" href="#">
                            <img src="/logo.png" alt="" width="50" height="50" />
                        </a>
                    
                    <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarTogglerDemo02" aria-controls="navbarTogglerDemo02" aria-expanded="false" aria-label="Toggle navigation">
                        <span className="navbar-toggler-icon"></span>
                    </button>
                    <div className="collapse navbar-collapse" id="navbarTogglerDemo02" ref={menuRef}>
                        <ul className="navbar-nav me-auto mb-2 mb-lg-0">
                            {links.map(l => (
                                <li key={l.href} className="nav-item">
                                    <Link href={l.href} className={`nav-link ${router.pathname === l.href ? 'active' : ''}`}>
                                        {l.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </nav>
        </header>
    )
}
