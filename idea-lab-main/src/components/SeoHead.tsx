import { useEffect } from "react";

interface SeoHeadProps {
  title: string;
  description: string;
  canonicalUrl: string;
  ogType?: string;
  ogImage?: string;
}

export const SeoHead = ({
  title,
  description,
  canonicalUrl,
  ogType = "website",
  ogImage = "https://neeshglobal.com/og-default.png",
}: SeoHeadProps) => {
  useEffect(() => {
    // 1. Update Title
    document.title = title;

    // Helper to update or create meta tag
    const setMetaTag = (selector: string, attrName: string, attrValue: string, content: string) => {
      let element = document.querySelector(selector);
      if (element) {
        element.setAttribute("content", content);
      } else {
        element = document.createElement("meta");
        element.setAttribute(attrName, attrValue);
        element.setAttribute("content", content);
        document.head.appendChild(element);
      }
    };

    // 2. Meta description
    setMetaTag('meta[name="description"]', "name", "description", description);
    setMetaTag('meta[name="title"]', "name", "title", title);

    // 3. OpenGraph tags
    setMetaTag('meta[property="og:title"]', "property", "og:title", title);
    setMetaTag('meta[property="og:description"]', "property", "og:description", description);
    setMetaTag('meta[property="og:url"]', "property", "og:url", canonicalUrl);
    setMetaTag('meta[property="og:type"]', "property", "og:type", ogType);
    setMetaTag('meta[property="og:image"]', "property", "og:image", ogImage);

    // 4. Twitter tags
    setMetaTag('meta[name="twitter:title"]', "name", "twitter:title", title);
    setMetaTag('meta[name="twitter:description"]', "name", "twitter:description", description);
    setMetaTag('meta[name="twitter:image"]', "name", "twitter:image", ogImage);

    // 5. Canonical link
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (canonicalLink) {
      canonicalLink.setAttribute("href", canonicalUrl);
    } else {
      canonicalLink = document.createElement("link");
      canonicalLink.setAttribute("rel", "canonical");
      canonicalLink.setAttribute("href", canonicalUrl);
      document.head.appendChild(canonicalLink);
    }
  }, [title, description, canonicalUrl, ogType, ogImage]);

  return null;
};
