import React from 'react';

type SectionHeaderProps = {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  titleId?: string;
  level?: 2 | 3;
  className?: string;
};

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  titleId,
  level = 2,
  className = ''
}: SectionHeaderProps) {
  const Heading = `h${level}` as const;
  return (
    <div className={`sectionHeader ${className}`.trim()}>
      <div className="sectionHeaderCopy">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <Heading id={titleId}>{title}</Heading>
        {description && <p className="sectionHeaderDescription">{description}</p>}
      </div>
      {action && <div className="sectionHeaderAction">{action}</div>}
    </div>
  );
}
