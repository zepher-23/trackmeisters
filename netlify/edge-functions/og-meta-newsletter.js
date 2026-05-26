export default async (request, context) => {
    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean);
    
    // Path looks like: /newsletter/BLjV7asdfgh....
    if (parts.length !== 2 || parts[0] !== 'newsletter') {
        return context.next();
    }

    const blogId = parts[1];

    // fetch the HTML response of the SPA
    const response = await context.next();
    const contentType = response.headers.get("content-type");
    
    // if not an HTML response, just return
    if (!contentType || !contentType.includes("text/html")) {
        return response;
    }
    
    let html = await response.text();

    try {
        const fbUrl = `https://firestore.googleapis.com/v1/projects/vinay-e2aa5/databases/(default)/documents/blogs/${blogId}`;
        const res = await fetch(fbUrl);
        
        if (res.ok) {
            const data = await res.json();
            if (data.fields) {
                const title = data.fields.title?.stringValue || 'Trackmeisters';
                const description = data.fields.excerpt?.stringValue || 'Trackmeisters Newsletter';
                let coverImg = data.fields.coverImage?.stringValue || 'https://trackmeisters.in/logo.png';

                // Ensure absolute URL
                if (coverImg.startsWith('/') || coverImg.startsWith('.')) {
                    coverImg = `https://trackmeisters.in${coverImg.startsWith('/') ? '' : '/'}${coverImg}`;
                }

                const metaTags = `
<meta property="og:title" content="${title.replace(/"/g, '&quot;')}" />
<meta property="og:description" content="${description.replace(/"/g, '&quot;')}" />
<meta property="og:image" content="${coverImg}" />
<meta property="og:url" content="${url.href}" />
<meta property="og:type" content="article" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${title.replace(/"/g, '&quot;')}" />
<meta name="twitter:description" content="${description.replace(/"/g, '&quot;')}" />
<meta name="twitter:image" content="${coverImg}" />
<title>${title.replace(/"/g, '&quot;')}</title>
`;

                html = html.replace('</head>', `${metaTags}</head>`);
            }
        }
    } catch (e) {
        console.error("OG Meta Edge Function Error:", e);
    }

    const modifiedResponse = new Response(html, response);
    modifiedResponse.headers.delete("content-length");
    return modifiedResponse;
};

export const config = { path: "/newsletter/*" };
