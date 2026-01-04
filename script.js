/*
    script.js
    - Smooth scroll
    - IntersectionObserver reveal with stagger
    - Parallax hero mousemove
    - Fetch README excerpts from GitHub raw URLs for each project card
    - Form stub handling
*/

document.addEventListener('DOMContentLoaded', () => {
    initSmoothScroll();
    initReveal();
    initParallax();
    initTilt();
    initHeroParticles();
    populateProjects();
    initContactForm();
    // removed section routing to allow normal vertical stacking and scrolling
    // initialize mobile toggling navbar behavior
    (function initMobileToggleNavbar(){
        var mobileNav = document.getElementById('mobileNav');
        if (!mobileNav) return;
        mobileNav.addEventListener('show.bs.collapse', function(){ document.body.classList.add('mobile-nav-open'); });
        mobileNav.addEventListener('hidden.bs.collapse', function(){ document.body.classList.remove('mobile-nav-open'); });
        // ensure clicking links inside closes the collapse (bootstrap provides data-bs-toggle but add safety)
        var links = mobileNav.querySelectorAll('.nav-link');
        links.forEach(function(l){ l.addEventListener('click', function(){ var inst = bootstrap.Collapse.getInstance(mobileNav); if (inst) inst.hide(); }); });
        // on resize remove class when viewport becomes desktop
        window.addEventListener('resize', function(){ if (window.innerWidth > 992) document.body.classList.remove('mobile-nav-open'); });
    })();
    initSidebarSpy();
    initMobileNavSidebarToggle();
});

// Hide sidebar while mobile top-nav collapse is open, restore on close if viewport allows
function initMobileNavSidebarToggle(){
    const collapseEl = document.getElementById('mobileNav');
    const sidebar = document.querySelector('aside.sidebar');
    if(!collapseEl || !sidebar) return;
    // toggle a body class instead of manipulating inline styles to avoid flicker
    // add class immediately to avoid flicker; measure height after collapse fully shown
    collapseEl.addEventListener('show.bs.collapse', ()=>{
        document.body.classList.add('mobile-nav-open');
    });
    collapseEl.addEventListener('shown.bs.collapse', ()=>{
        try{
            const h = collapseEl.getBoundingClientRect().height || 0;
            // keep a small gap so the hero sits just below the navbar (not too far)
            const GAP = 4; // px
            const padding = Math.max(0, h - GAP);
            const container = document.querySelector('.portfolio-container');
            if(container){ container.style.paddingTop = padding + 'px'; }
        }catch(e){ /* ignore measurement errors */ }
    });
    // use 'hidden' event to remove the class after collapse fully closes and restore layout
    collapseEl.addEventListener('hidden.bs.collapse', ()=>{
        document.body.classList.remove('mobile-nav-open');
        const container = document.querySelector('.portfolio-container');
        if(container){ container.style.paddingTop = ''; }
    });

    // ensure the class is removed if viewport is resized to desktop sizes
    window.addEventListener('resize', ()=>{
        if(window.matchMedia('(min-width:993px)').matches){
            document.body.classList.remove('mobile-nav-open');
            const container = document.querySelector('.portfolio-container');
            if(container){ container.style.paddingTop = ''; }
        }
    }, {passive:true});

    // also add immediate class on the toggle button press to avoid timing flicker
    const toggles = document.querySelectorAll('[data-bs-target="#mobileNav"]');
    toggles.forEach(btn=>{
        btn.addEventListener('pointerdown', (e)=>{
            // if collapse is currently closed, add class immediately so sidebar is hidden
            if(!collapseEl.classList.contains('show')){
                document.body.classList.add('mobile-nav-open');
            }
        });
    });
}

// Highlight sidebar nav items based on scroll position
function initSidebarSpy(){
    // Adapted to sidebar links
    const links = Array.from(document.querySelectorAll('.sidebar .nav-link'));
    if(!links.length) return;
    const sections = links.map(l=> document.querySelector(l.getAttribute('href')) ).filter(Boolean);
    const observer = new IntersectionObserver((entries)=>{
        entries.forEach(entry=>{
            if(entry.isIntersecting){
                const id = `#${entry.target.id}`;
                links.forEach(l=> l.classList.toggle('active', l.getAttribute('href')===id));
            }
        });
    },{threshold:0.55});
    sections.forEach(s=> observer.observe(s));

    // click -> set active immediately
    links.forEach(l=> l.addEventListener('click', ()=>{
        links.forEach(x=> x.classList.remove('active'));
        l.classList.add('active');
    }));
}

// Smooth scroll for local anchors
function initSmoothScroll(){
    document.querySelectorAll('a[href^="#"]').forEach(a=>{
        a.addEventListener('click', e=>{
            const href = a.getAttribute('href');
            if(href.length>1){
                e.preventDefault();
                const el = document.querySelector(href);
                if(el) el.scrollIntoView({behavior:'smooth',block:'start'});
            }
        })
    })
}

// Show/hide sections driven by top-nav clicks.
function initSectionRouting(){
    // treat both header and section elements with ids as routable targets (includes #hero)
    const routables = Array.from(document.querySelectorAll('header[id], section[id]'));
    if(!routables.length) return;

    // Hide all routable sections except hero initially
    routables.forEach(s=>{
        if(s.id !== 'hero') s.classList.add('hidden-section');
    });

    // If a hash is present and matches a routable, show it on load
    const initialHash = (location.hash || '').replace('#','');
    if(initialHash){
        const target = document.getElementById(initialHash);
        if(target) showSection(initialHash, {replaceState:true});
    }

    // Expose click handling for nav links (top-nav)
    document.querySelectorAll('.top-nav .nav-link').forEach(a=>{
        a.addEventListener('click', e=>{
            e.preventDefault();
            const id = a.getAttribute('href').replace('#','');
            showSection(id);
        });
    });

    // Brand click should show hero (bring back hero view)
    const brand = document.querySelector('.top-nav .nav-brand a');
    if(brand){
        brand.addEventListener('click', e=>{
            e.preventDefault();
            showSection('hero');
        });
    }
}

function showSection(id, opts={replaceState:false}){
    if(!id) return;
    const routables = Array.from(document.querySelectorAll('header[id], section[id]'));
    const target = document.getElementById(id);
    if(!target) return;

    // hide all routable sections
    routables.forEach(s=> s.classList.add('hidden-section'));

    // reveal target
    target.classList.remove('hidden-section');

    // update history (optional)
    try{
        const url = `#${id}`;
        if(opts.replaceState) history.replaceState(null,'',url); else history.pushState(null,'',url);
    }catch(e){}

    // update top-nav active state
    const links = Array.from(document.querySelectorAll('.top-nav .nav-link'));
    links.forEach(l=> l.classList.toggle('active', l.getAttribute('href') === `#${id}`));

    // ensure visible and run reveal animations
    target.scrollIntoView({behavior:'smooth',block:'start'});
}

// IntersectionObserver reveal with support for staggered children
function initReveal(){
    const observer = new IntersectionObserver((entries)=>{
        entries.forEach(entry=>{
            if(entry.isIntersecting){
                entry.target.classList.add('active');
            }
        });
    },{threshold:0.12});

    const reveals = Array.from(document.querySelectorAll('.reveal'));
    reveals.forEach((el,i)=>{
        // additive stagger via inline transition-delay
        el.style.transitionDelay = `${i * 60}ms`;
        observer.observe(el);
    });
}

// Subtle parallax on hero based on mouse move (desktop)
function initParallax(){
    const hero = document.querySelector('.hero-section');
    if(!hero) return;
    hero.addEventListener('mousemove', e=>{
        const w = hero.offsetWidth; const h = hero.offsetHeight;
        const x = (e.clientX - hero.getBoundingClientRect().left) / w - 0.5;
        const y = (e.clientY - hero.getBoundingClientRect().top) / h - 0.5;
        document.querySelectorAll('.hero-layer').forEach((layer,idx)=>{
            const depth = (idx+1) * 8;
            layer.style.transform = `translate3d(${ -x*depth }px, ${ -y*depth }px, 0)`;
        });
    });

    // scroll-based parallax (subtle)
    const layers = document.querySelectorAll('.hero-layer');
    window.addEventListener('scroll', ()=>{
        const rect = hero.getBoundingClientRect();
        const pct = Math.min(Math.max(-rect.top / window.innerHeight, 0), 1);
        layers.forEach((layer, idx)=>{
            const depth = (idx+1) * 28;
            layer.style.transform = `translate3d(0, ${-pct * depth}px, 0)`;
        });
    }, {passive:true});
}

// Simple tilt effect for cards and glass elements
function initTilt(){
    const tiltEls = document.querySelectorAll('.project-card, .skill-card, .profile-card, .glass-card');
    tiltEls.forEach(el=>{
        el.style.transformStyle = 'preserve-3d';
        el.addEventListener('mousemove', (e)=>{
            const rect = el.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const y = (e.clientY - rect.top) / rect.height;
            const rx = (y - 0.5) * 8; // rotateX
            const ry = (x - 0.5) * -10; // rotateY
            el.style.transform = `perspective(900px) translateZ(0) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-6px)`;
            el.style.transition = 'transform 0.12s ease-out';
        });
        el.addEventListener('mouseleave', ()=>{
            el.style.transform = '';
            el.style.transition = 'transform 0.6s cubic-bezier(.2,.9,.2,1)';
        });
    });
}

// Create a soft particle canvas inside the hero section
function initHeroParticles(){
    const hero = document.querySelector('.hero-section');
    if(!hero) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'hero-canvas';
    hero.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    let w=0,h=0,particles=[];
    function resize(){ w = canvas.width = hero.offsetWidth; h = canvas.height = hero.offsetHeight; }
    function createParticles(){
        particles = [];
        const count = Math.min(40, Math.floor((w*h)/60000));
        for(let i=0;i<count;i++){
            particles.push({ x: Math.random()*w, y: Math.random()*h, r: 10+Math.random()*44, vx:(Math.random()-0.5)*0.12, vy:-0.02-Math.random()*0.2, alpha:0.06+Math.random()*0.14, hue:250+Math.random()*120 });
        }
    }
    function draw(){
        ctx.clearRect(0,0,w,h);
        particles.forEach(p=>{
            p.x += p.vx; p.y += p.vy;
            if(p.y + p.r < -60) p.y = h + p.r;
            if(p.x - p.r > w + 60) p.x = -p.r;
            const g = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r);
            g.addColorStop(0, `hsla(${p.hue},85%,66%,${p.alpha})`);
            g.addColorStop(1, `hsla(${p.hue},85%,60%,0)`);
            ctx.fillStyle = g;
            ctx.fillRect(p.x - p.r, p.y - p.r, p.r*2, p.r*2);
        });
        requestAnimationFrame(draw);
    }
    resize(); createParticles(); draw();
    window.addEventListener('resize', ()=>{ resize(); createParticles(); }, {passive:true});
}

// Cursor follower - subtle blurred circle
// Cursor follower removed — functionality intentionally disabled.

// Fetch README excerpts from GitHub raw URLs.
// Tries 'main' then 'master'. If fails, shows placeholder.
async function fetchReadme(owner, repo){
    const branches = ['main','master'];
    for(const b of branches){
        const url = `https://raw.githubusercontent.com/${owner}/${repo}/${b}/README.md`;
        try{
            const res = await fetch(url);
            if(!res.ok) continue;
            const text = await res.text();
            return text;
        }catch(err){
            // continue to next branch
        }
    }
    return null;
}

// Limit excerpt lines and sanitize basic markdown
function getExcerpt(text, maxLines=6){
    if(!text) return 'README not available — open the repo to view full docs.';
    const lines = text.split(/\r?\n/).filter(l=>l.trim().length>0);
    const excerpt = lines.slice(0,maxLines).map(l=>{
        // remove markdown headings and images for compact display
        return l.replace(/^#{1,6}\s*/,'').replace(/!\[.*?\]\(.*?\)/g,'').replace(/\[(.*?)\]\(.*?\)/g,'$1');
    }).join(' ');
    return excerpt;
}

// Populate projects on page: fetch README and add tech badges & links
async function populateProjects(){
    const cards = document.querySelectorAll('#project-list .project-card');
    for(const card of cards){
        const owner = card.dataset.owner;
        const repo = card.dataset.repo;
        const tech = card.dataset.tech || '';
        const openBtn = card.querySelector('.open-repo');
        const iconLink = card.querySelector('.repo-icon');
        // summary element: prefer curated .project-summary, fallback to .project-excerpt
        const excerptEl = card.querySelector('.project-summary') || card.querySelector('.project-excerpt');
        const techList = card.querySelector('.tech-list');

        const repoUrl = `https://github.com/${owner}/${repo}`;
        if(openBtn){ openBtn.href = repoUrl; }
        if(iconLink){ iconLink.href = repoUrl; }

        // Render tech badges (clear existing to avoid duplicates) with small staggered entrance
        if(techList){
            techList.innerHTML = '';
            tech.split(',').map(t=>t.trim()).filter(Boolean).forEach((t, idx)=>{
                const b = document.createElement('span');
                b.className = 'badge rounded-pill me-1';
                b.textContent = t;
                b.style.opacity = '0';
                b.style.transform = 'translateY(8px)';
                b.style.transition = 'transform .36s cubic-bezier(.2,.9,.2,1),opacity .36s';
                setTimeout(()=>{ b.style.opacity = '1'; b.style.transform = 'translateY(0)'; }, 100 * idx);
                techList.appendChild(b);
            });
        }

        // If the card still contains the 'Loading README' placeholder, fetch README as fallback.
        const needFetch = excerptEl && /Loading README|README not available|README not found/i.test(excerptEl.textContent);
        if(needFetch){
            try{
                const md = await fetchReadme(owner,repo);
                if(md && excerptEl){
                    excerptEl.textContent = getExcerpt(md,6);
                } else if(excerptEl){
                    excerptEl.textContent = 'README not found online. Click to view the repository.';
                }
            }catch(err){
                if(excerptEl) excerptEl.textContent = 'Error loading README — open the repo to view details.';
            }
        }
    }
}

// Contact form stub (no back-end). Provide UI feedback only.
function initContactForm(){
    const form = document.getElementById('contact-form');
    if(!form) return;
    form.addEventListener('submit', e=>{
        e.preventDefault();
        const btn = form.querySelector('button[type="submit"]');
        const name = document.getElementById('cname') ? document.getElementById('cname').value.trim() : '';
        const email = document.getElementById('cemail') ? document.getElementById('cemail').value.trim() : '';
        const message = document.getElementById('cmessage') ? document.getElementById('cmessage').value.trim() : '';
        btn.disabled = true; btn.textContent = 'Sending...';

        // If the developer added a client-side EmailJS config, use it to send email.
        // Place configuration in a client file or in the console as:
        // window.EMAILJS_CONFIG = { serviceID: 'service_xxx', templateID: 'template_xxx', publicKey: 'user_xxx' }
        const cfg = window.EMAILJS_CONFIG;
        if(cfg && window.emailjs){
            try{ if(cfg.publicKey) emailjs.init(cfg.publicKey); }catch(e){ /* ignore */ }
            const templateParams = {
                from_name: name || '(no name)',
                from_email: email || '(no email)',
                message: message || '(no message)'
            };
            emailjs.send(cfg.serviceID, cfg.templateID, templateParams).then((resp)=>{
                // success — show confirmation modal with sent state
                showSimulatedModal({name,email,message,status:'sent'});
                // restore and reset on modal close
                document.addEventListener('simModalClosed', ()=>{ btn.disabled=false; btn.textContent='Send Message'; form.reset(); }, { once:true });
            }).catch(err=>{
                // on failure, show modal with error and mailto fallback link
                const mailto = `mailto:${encodeURIComponent('virubhalgamiya@gmail.com')}?subject=${encodeURIComponent('Portfolio contact from '+(name||'Visitor'))}&body=${encodeURIComponent(message+'\n\nFrom: '+(name||'')+' <'+(email||'')+'>')}`;
                showSimulatedModal({name,email,message,status:'failed',error:err,mailto});
                document.addEventListener('simModalClosed', ()=>{ btn.disabled=false; btn.textContent='Send Message'; }, { once:true });
            });
            return;
        }

        // No EmailJS configured — show simulated modal and provide mailto fallback
        const fallbackMailto = `mailto:virubhalgamiya@gmail.com?subject=${encodeURIComponent('Portfolio contact from '+(name||'Visitor'))}&body=${encodeURIComponent(message+'\n\nFrom: '+(name||'')+' <'+(email||'')+'>')}`;
        showSimulatedModal({name,email,message,status:'simulated',mailto:fallbackMailto});
        const restore = ()=>{ btn.disabled=false; btn.textContent='Send Message'; form.reset(); };
        document.addEventListener('simModalClosed', restore, { once:true });
    });
}

// Mobile nav lock removed — no scroll-lock behavior applied.

// Creates and shows a simulated modal with the form values
function showSimulatedModal({name,email,message,status, error, mailto}){
    // if already present, update and show
    let modal = document.querySelector('.sim-modal');
    if(!modal){
        modal = document.createElement('div');
        modal.className = 'sim-modal';
        modal.innerHTML = `
            <div class="sim-dialog">
                <header class="sim-header">
                    <h3 class="sim-title">Message simulated</h3>
                    <button class="sim-close" aria-label="Close">×</button>
                </header>
                <div class="sim-body">
                    <p class="sim-note">Message simulated — integrate a backend or form service to send emails.</p>
                    <div class="sim-content">
                        <p><strong>Name:</strong> <span class="sim-name"></span></p>
                        <p><strong>Email:</strong> <span class="sim-email"></span></p>
                        <p><strong>Message:</strong></p>
                        <div class="sim-message-box"></div>
                    </div>
                </div>
                <footer class="sim-footer">
                    <div class="sim-actions" style="display:flex;gap:8px;align-items:center;">
                        <a class="btn btn-ghost sim-mailto" target="_blank" style="display:none">Open mail client</a>
                        <button class="btn btn-primary sim-ok">OK</button>
                    </div>
                </footer>
            </div>
        `;
        document.body.appendChild(modal);

        // events
        modal.querySelector('.sim-close').addEventListener('click', ()=> closeSimModal(modal));
        modal.querySelector('.sim-ok').addEventListener('click', ()=> closeSimModal(modal));
        modal.addEventListener('click', (e)=>{ if(e.target===modal) closeSimModal(modal); });
        document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeSimModal(modal); });
    }

    modal.querySelector('.sim-name').textContent = name || '(no name)';
    modal.querySelector('.sim-email').textContent = email || '(no email)';
    const msgBox = modal.querySelector('.sim-message-box');
    msgBox.textContent = message || '(no message)';

    const title = modal.querySelector('.sim-title');
    const note = modal.querySelector('.sim-note');
    const mailBtn = modal.querySelector('.sim-mailto');

    if(status === 'sent'){
        title.textContent = 'Message sent';
        note.textContent = 'Your message was sent successfully. Thank you!';
        mailBtn.style.display = 'none';
    } else if(status === 'failed'){
        title.textContent = 'Sending failed';
        note.textContent = 'There was an error sending your message. You can open your email client to send manually.';
        if(mailto){ mailBtn.href = mailto; mailBtn.style.display = 'inline-block'; }
    } else if(status === 'simulated'){
        title.textContent = 'Message simulated';
        note.textContent = 'No mail service configured. You can open your email client or configure EmailJS for direct sending.';
        if(mailto){ mailBtn.href = mailto; mailBtn.style.display = 'inline-block'; }
    } else {
        // default simulated
        title.textContent = 'Message simulated';
        note.textContent = 'Message simulated — integrate a backend or form service to send emails.';
        if(mailto){ mailBtn.href = mailto; mailBtn.style.display = 'inline-block'; }
    }

    modal.classList.add('open');
}

function closeSimModal(modal){
    if(!modal) modal = document.querySelector('.sim-modal');
    if(!modal) return;
    modal.classList.remove('open');
    // emit event so caller can restore UI
    const ev = new CustomEvent('simModalClosed');
    document.dispatchEvent(ev);
}
