import { cn } from "@/lib/utils";

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={index} className="font-semibold text-foreground">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={index}>{part}</span>
    )
  );
}

function renderParagraph(paragraph: string, key: string) {
  const trimmed = paragraph.trim();
  if (!trimmed) return null;

  if (trimmed.includes("✅")) {
    const items = trimmed
      .split(/\s*✅\s*/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (items.length > 1) {
      return (
        <ul key={key} className="space-y-2 text-sm text-muted-foreground">
          {items.map((item, index) => (
            <li key={index} className="flex gap-2.5 items-start">
              <span className="text-emerald-600 shrink-0 mt-0.5" aria-hidden>
                ✅
              </span>
              <span className="leading-relaxed">{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      );
    }
  }

  const emojiBullets = trimmed.split(/\s(?=[📍🏖️🍹🚕💵🛏️🌴])/u).filter(Boolean);
  if (emojiBullets.length > 1) {
    return (
      <ul key={key} className="space-y-2 text-sm text-muted-foreground">
        {emojiBullets.map((item, index) => (
          <li key={index} className="leading-relaxed">
            {renderInline(item.trim())}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <p key={key} className="text-sm text-muted-foreground leading-relaxed">
      {renderInline(trimmed)}
    </p>
  );
}

interface ListingDescriptionContentProps {
  content: string;
  className?: string;
}

/**
 * Affiche une description saisie par le propriétaire (markdown léger :
 * ### titres, **gras**, listes avec ✅ ou emojis).
 */
export function ListingDescriptionContent({
  content,
  className,
}: ListingDescriptionContentProps) {
  const normalized = content.replace(/\r\n/g, "\n").trim();
  const blocks = normalized.split(/\n(?=###\s)/);

  return (
    <div className={cn("space-y-6", className)}>
      {blocks.map((block, blockIndex) => {
        const headingMatch = block.match(/^###\s+(.+?)(?:\n([\s\S]*))?$/);

        if (headingMatch) {
          const [, heading, body = ""] = headingMatch;
          const paragraphs = body.split(/\n+/).filter((paragraph) => paragraph.trim());

          return (
            <section key={blockIndex} className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground tracking-tight">
                {heading.trim()}
              </h3>
              <div className="space-y-3 pl-0.5">
                {paragraphs.map((paragraph, index) =>
                  renderParagraph(paragraph, `${blockIndex}-${index}`)
                )}
              </div>
            </section>
          );
        }

        const paragraphs = block.split(/\n+/).filter((paragraph) => paragraph.trim());
        return (
          <div key={blockIndex} className="space-y-3">
            {paragraphs.map((paragraph, index) =>
              renderParagraph(paragraph, `${blockIndex}-${index}`)
            )}
          </div>
        );
      })}
    </div>
  );
}
