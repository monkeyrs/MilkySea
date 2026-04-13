import { useTranslation } from 'react-i18next';

import type { DocumentSummary } from '../../../shared/types/document';

interface WorkspaceSidebarProps {
  documents: DocumentSummary[];
  currentPath?: string;
  onSelect: (documentPath: string) => void;
}

export const WorkspaceSidebar = ({
  documents,
  currentPath,
  onSelect,
}: WorkspaceSidebarProps) => {
  const { t } = useTranslation();

  return (
    <aside className="workspace-sidebar">
      <div className="workspace-sidebar__header">
        <h2>{t('sidebar.title')}</h2>
      </div>
      {documents.length === 0 ? (
        <p className="workspace-sidebar__empty">{t('sidebar.noDocuments')}</p>
      ) : (
        <ul className="workspace-sidebar__list">
          {documents.map((document) => (
            <li key={document.path}>
              <button
                className={`workspace-sidebar__item${
                  currentPath === document.path ? ' workspace-sidebar__item--active' : ''
                }`}
                onClick={() => onSelect(document.path)}
                type="button"
              >
                <span>{document.relativePath}</span>
                {document.hasRecoveryDraft ? (
                  <span className="workspace-sidebar__badge">{t('sidebar.draftBadge')}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
};
