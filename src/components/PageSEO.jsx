import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getSEOForPath } from '../utils/seoConfig';

const updateOrCreateMeta = (selector, attributeName, attributeValue, content) => {
  let element = document.querySelector(selector);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attributeName, attributeValue);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
};

const PageSEO = () => {
  const location = useLocation();

  useEffect(() => {
    // Skip if on admin pages
    if (location.pathname.startsWith('/admin')) return;

    const seo = getSEOForPath(location.pathname);

    // Update Document Title
    document.title = seo.title;

    // Update Meta Description
    updateOrCreateMeta('meta[name="description"]', 'name', 'description', seo.description);

    // Update Open Graph tags
    updateOrCreateMeta('meta[property="og:title"]', 'property', 'og:title', seo.title);
    updateOrCreateMeta('meta[property="og:description"]', 'property', 'og:description', seo.description);

    // Update Twitter tags
    updateOrCreateMeta('meta[name="twitter:title"]', 'name', 'twitter:title', seo.title);
    updateOrCreateMeta('meta[name="twitter:description"]', 'name', 'twitter:description', seo.description);
  }, [location.pathname]);

  return null;
};

export default PageSEO;
