const SEO_CONFIG = {
    '/events': {
        title: 'Racing Calendar & Events | Trackmeisters',
        description: 'Discover upcoming Trackmeisters track days, racing series, and motorsport events across India.'
    },
    '/standings': {
        title: 'Leaderboard & Lap Records | Trackmeisters',
        description: 'Official Trackmeisters leaderboard featuring verified fastest laps, driver standings, and track records.'
    },
    '/contact': {
        title: 'Contact Us | Trackmeisters',
        description: 'Contact the Trackmeisters team for event entries, track day bookings, sponsorship opportunities, and support.'
    },
    '/classifieds': {
        title: 'Classifieds Marketplace | Trackmeisters',
        description: 'Explore verified performance cars, track builds, automotive parts, and racing gear on Trackmeisters Classifieds.'
    },
    '/media': {
        title: 'Media & Highlights | Trackmeisters',
        description: 'Browse photo galleries, onboard footage, and video highlights from Trackmeisters motorsport events.'
    },
    '/fantasy-league': {
        title: 'F1 Fantasy League | Trackmeisters',
        description: 'Join the official Trackmeisters F1 Fantasy League and compete against motorsport enthusiasts.'
    },
    '/about': {
        title: "About Trackmeisters | India's Motorsport Community",
        description: 'Learn about Trackmeisters, our mission to advance Indian motorsport, grassroots racing culture, and driver safety.'
    },
    '/register': {
        title: 'Event Registration | Trackmeisters',
        description: 'Register your vehicle and secure your spot for upcoming Trackmeisters track days and racing events.'
    },
    '/terms': {
        title: 'Terms of Service | Trackmeisters',
        description: 'Review the official terms of service, participation guidelines, and safety policies for Trackmeisters events.'
    },
    '/privacy': {
        title: 'Privacy Policy | Trackmeisters',
        description: 'Trackmeisters privacy policy outlining how driver and member information is securely collected and managed.'
    },
    '/waivers': {
        title: 'Waivers & Track Rules | Trackmeisters',
        description: 'Access official liability waivers, track day rules, and driver conduct requirements for Trackmeisters.'
    }
};

export default async (request, context) => {
    const url = new URL(request.url);
    const pathname = url.pathname.replace(/\/+$/, '') || '/';
    const seo = SEO_CONFIG[pathname];

    if (!seo) {
        return context.next();
    }

    const response = await context.next();
    const contentType = response.headers.get("content-type");

    if (!contentType || !contentType.includes("text/html")) {
        return response;
    }

    let html = await response.text();

    const title = seo.title.replace(/"/g, '&quot;');
    const desc = seo.description.replace(/"/g, '&quot;');

    // Replace Title
    html = html.replace(/<title>.*?<\/title>/i, `<title>${title}</title>`);

    // Replace Meta Description
    html = html.replace(/<meta\s+name="description"\s+content=".*?"\s*\/?>/i, `<meta name="description" content="${desc}" />`);

    // Replace OpenGraph Title & Description
    html = html.replace(/<meta\s+property="og:title"\s+content=".*?"\s*\/?>/i, `<meta property="og:title" content="${title}" />`);
    html = html.replace(/<meta\s+property="og:description"\s+content=".*?"\s*\/?>/i, `<meta property="og:description" content="${desc}" />`);

    // Replace Twitter Title & Description
    html = html.replace(/<meta\s+name="twitter:title"\s+content=".*?"\s*\/?>/i, `<meta name="twitter:title" content="${title}" />`);
    html = html.replace(/<meta\s+name="twitter:description"\s+content=".*?"\s*\/?>/i, `<meta name="twitter:description" content="${desc}" />`);

    const modifiedResponse = new Response(html, response);
    modifiedResponse.headers.delete("content-length");
    return modifiedResponse;
};

export const config = {
    path: [
        "/events",
        "/standings",
        "/contact",
        "/classifieds",
        "/media",
        "/fantasy-league",
        "/about",
        "/register",
        "/terms",
        "/privacy",
        "/waivers"
    ]
};
