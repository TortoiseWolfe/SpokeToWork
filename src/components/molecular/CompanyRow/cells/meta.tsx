/**
 * Small read-only cells: Contact, Priority, Applications count, Website.
 */

import type { CompanyWithApplications } from '@/types/company';
import { hasApplications, type CompanyType } from './types';

export function ContactCell({ company }: { company: CompanyType }) {
  const has =
    company.contact_name ||
    company.contact_title ||
    company.phone ||
    company.email;
  return (
    <td className="hidden md:table-cell">
      {has && (
        <div className="space-y-0.5 text-sm">
          {company.contact_name && (
            <div className="font-medium">{company.contact_name}</div>
          )}
          {company.contact_title && (
            <div className="text-base-content/85 text-xs">
              {company.contact_title}
            </div>
          )}
          {company.phone && (
            <div className="text-xs">
              <a href={`tel:${company.phone}`} className="link link-hover">
                {company.phone}
              </a>
            </div>
          )}
          {company.email && (
            <div className="text-xs">
              <a href={`mailto:${company.email}`} className="link link-primary">
                {company.email}
              </a>
            </div>
          )}
        </div>
      )}
    </td>
  );
}

function priorityBadge(p: number): string {
  if (p === 1) return 'badge-error';
  if (p === 2) return 'badge-warning';
  if (p >= 4) return 'badge-ghost';
  return 'badge-outline';
}

export function PriorityCell({ priority }: { priority: number }) {
  return (
    <td className="hidden text-center sm:table-cell">
      <span
        className={`badge ${priorityBadge(priority)} badge-sm`}
        title={`Priority ${priority} (1=highest, 5=lowest)`}
      >
        {priority}
      </span>
    </td>
  );
}

export function ApplicationsCell({ company }: { company: CompanyType }) {
  const totalCount =
    (company as CompanyWithApplications).total_applications ??
    (hasApplications(company) ? company.applications.length : 0);
  return (
    <td className="hidden text-center md:table-cell">
      {totalCount > 0 ? (
        <span className="badge badge-info badge-sm">{totalCount}</span>
      ) : (
        <span className="text-base-content/75">-</span>
      )}
    </td>
  );
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function WebsiteCell({ website }: { website: string | null }) {
  return (
    <td className="hidden lg:table-cell">
      {website && (
        <a
          href={website}
          target="_blank"
          rel="noopener noreferrer"
          className="link link-primary inline-block max-w-[150px] truncate text-sm"
          onClick={(e) => e.stopPropagation()}
          title={website}
        >
          {hostname(website)}
        </a>
      )}
    </td>
  );
}
