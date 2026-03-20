import { COMPANY_SOURCE_LABELS, COMPANY_SOURCE_COLORS } from '@/types/company';
import { isUnifiedCompany, type CompanyType } from './types';

const PRIORITY_BANG: Record<number, string> = { 1: '!!', 2: '!' };

/** Name + source/range/inactive badges + address */
export function NameCell({
  company,
  isOnActiveRoute,
}: {
  company: CompanyType;
  isOnActiveRoute: boolean;
}) {
  return (
    <td>
      <div className="flex items-center gap-2">
        {company.priority <= 2 && (
          <span
            className="text-warning font-bold"
            title={`Priority ${company.priority}`}
          >
            {PRIORITY_BANG[company.priority]}
          </span>
        )}
        {isOnActiveRoute && (
          <span
            className="text-primary"
            title="On active route"
            aria-label="On active route"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5.5 17.5a3 3 0 100-6 3 3 0 000 6zm13 0a3 3 0 100-6 3 3 0 000 6zM5.5 14.5h4l2-3m0 0l2.5-3 3 3m-5.5 0l2 3h4.5"
              />
            </svg>
            <span className="sr-only">On active route</span>
          </span>
        )}
        <div>
          <div className="flex items-center gap-2 font-bold">
            {company.name}
            {isUnifiedCompany(company) && (
              <span
                className={`badge ${COMPANY_SOURCE_COLORS[company.source]} badge-xs`}
                title={
                  company.source === 'shared'
                    ? 'Community company'
                    : 'Your private company'
                }
              >
                {COMPANY_SOURCE_LABELS[company.source]}
              </span>
            )}
            {'extended_range' in company && company.extended_range && (
              <span
                className="badge badge-warning badge-xs"
                title="Extended range"
              >
                Far
              </span>
            )}
            {!company.is_active && (
              <span className="badge badge-ghost badge-xs">Inactive</span>
            )}
          </div>
          <div className="text-base-content/85 text-sm">{company.address}</div>
        </div>
      </div>
    </td>
  );
}
