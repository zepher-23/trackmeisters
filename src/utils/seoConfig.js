export const SEO_CONFIG = {
  '/': {
    title: 'Trackmeisters',
    description: 'Trackmeisters is a Bengaluru based motorsport organisation specialising in competitive racing events, track days, driver training and performance driving experiences.'
  },
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
  '/newsletter': {
    title: 'Newsletter & Stories | Trackmeisters',
    description: 'Stay updated with motorsport articles, driver spotlights, track guides, and event recaps from Trackmeisters.'
  },
  '/fantasy-league': {
    title: 'F1 Fantasy League | Trackmeisters',
    description: 'Join the official Trackmeisters F1 Fantasy League and compete against motorsport enthusiasts.'
  },
  '/about': {
    title: 'About Trackmeisters | India\'s Motorsport Community',
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

export const getSEOForPath = (pathname) => {
  // Exact match
  if (SEO_CONFIG[pathname]) {
    return SEO_CONFIG[pathname];
  }

  // Base route match (e.g. /events/past/123 -> /events)
  const baseRoute = '/' + (pathname.split('/').filter(Boolean)[0] || '');
  if (SEO_CONFIG[baseRoute]) {
    return SEO_CONFIG[baseRoute];
  }

  // Fallback to Home
  return SEO_CONFIG['/'];
};
