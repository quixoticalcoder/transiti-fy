/**
 * src/components/Breadcrumb.jsx
 * --------------------------------
 * Auto-generates a breadcrumb trail from the current URL path, e.g.
 * "/fleet/vehicles/12" -> Home / Fleet / Vehicles / 12
 *
 * Drop this into MainLayout (or any page) - it reads the route itself
 * via react-router's useLocation, no props required for the basic case.
 * Pass a `labels` map to override how a path segment is displayed.
 */

import React from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

const Breadcrumb = ({ labels = {} }) => {
  const location = useLocation();
  const segments = location.pathname.split("/").filter(Boolean);

  const formatLabel = (segment) => {
    if (labels[segment]) return labels[segment];
    return segment
      .replace(/-/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  return (
    <nav aria-label="Breadcrumb" className="flex items-center text-sm text-gray-500 dark:text-gray-400">
      <Link to="/" className="flex items-center hover:text-blue-600 dark:hover:text-blue-400">
        <Home size={14} className="mr-1" />
        Home
      </Link>

      {segments.map((segment, index) => {
        const path = "/" + segments.slice(0, index + 1).join("/");
        const isLast = index === segments.length - 1;

        return (
          <span key={path} className="flex items-center">
            <ChevronRight size={14} className="mx-1" />
            {isLast ? (
              <span className="font-medium text-gray-800 dark:text-gray-200">
                {formatLabel(segment)}
              </span>
            ) : (
              <Link to={path} className="hover:text-blue-600 dark:hover:text-blue-400">
                {formatLabel(segment)}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
};

export default Breadcrumb;
