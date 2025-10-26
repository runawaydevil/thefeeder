import { BookOpen, Frown, Search as SearchIcon, Filter } from 'lucide-react';

interface Props {
  type?: 'no-items' | 'no-results' | 'filtered' | 'error';
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({ 
  type = 'no-items', 
  message, 
  action 
}: Props) {
  const config = {
    'no-items': {
      icon: BookOpen,
      title: 'No articles found',
      description: message || 'No articles available at the moment.',
    },
    'no-results': {
      icon: SearchIcon,
      title: 'No results',
      description: message || 'Try adjusting your search or filters.',
    },
    'filtered': {
      icon: Filter,
      title: 'Everything filtered',
      description: message || 'No articles match the active filters.',
    },
    'error': {
      icon: Frown,
      title: 'Oops! Something went wrong',
      description: message || 'Unable to load articles.',
    },
  };

  const { icon: Icon, title, description } = config[type];

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="mb-4 p-4 bg-border/20 rounded-full">
        <Icon className="w-12 h-12 text-muted" />
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted max-w-md">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-6 px-6 py-2 bg-accent text-accent-fg rounded-lg hover:bg-accent-hover transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}




