// Knowledge Base Page - "Teach Your AI" with expert knowledge management
import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  FileText,
  Tag,
  Link,
  Trash2,
  Edit,
  Brain,
  Database,
  ArrowLeft,
  X,
  ChevronRight,
  Clock,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  Loader2,
} from 'lucide-react';

// Layout
import { PageHeader, PrimaryButton, SecondaryButton, GhostButton } from '@/components/layout';

// UI Components
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  Button,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui';

// --- Types ---

type EntryType = 'product_info' | 'brand_voice' | 'expert_knowledge' | 'faq' | 'guidelines';

interface KnowledgeBaseEntry {
  id: string;
  title: string;
  content: string;
  sourceUrl: string | null;
  type: EntryType;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface KnowledgeBaseItem {
  id: string;
  name: string;
  description: string;
  tags: string[];
  entryCount: number;
  entries?: KnowledgeBaseEntry[];
  createdAt: string;
  updatedAt: string;
}

// --- Constants ---

const API_BASE = '/api/knowledge-base';

const ENTRY_TYPE_OPTIONS: { value: EntryType; label: string }[] = [
  { value: 'product_info', label: 'Product Info' },
  { value: 'brand_voice', label: 'Brand Voice' },
  { value: 'expert_knowledge', label: 'Expert Knowledge' },
  { value: 'faq', label: 'FAQ' },
  { value: 'guidelines', label: 'Guidelines' },
];

function getTypeBadgeStyle(type: EntryType): string {
  switch (type) {
    case 'product_info':
      return 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100';
    case 'brand_voice':
      return 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100';
    case 'expert_knowledge':
      return 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100';
    case 'faq':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100';
    case 'guidelines':
      return 'bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-100';
    default:
      return 'bg-zinc-100 text-zinc-600 border-zinc-200 hover:bg-zinc-100';
  }
}

function getTypeLabel(type: EntryType): string {
  const option = ENTRY_TYPE_OPTIONS.find((o) => o.value === type);
  return option?.label || type;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return formatDate(dateStr);
}

// --- Notification Banner ---

function NotificationBanner({
  type,
  message,
  onDismiss,
}: {
  type: 'success' | 'error';
  message: string;
  onDismiss: () => void;
}) {
  return (
    <div
      className={`
        flex items-center justify-between gap-3 px-4 py-3 rounded-lg border mb-6
        animate-in fade-in slide-in-from-top-2 duration-300
        ${
          type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }
      `}
    >
      <div className="flex items-center gap-2">
        {type === 'success' ? (
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
        ) : (
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
        )}
        <p className="text-sm font-medium">{message}</p>
      </div>
      <button
        onClick={onDismiss}
        className="text-current opacity-60 hover:opacity-100 transition-opacity"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// --- Tag Input Component ---

function TagInput({
  tags,
  onChange,
  placeholder,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}) {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && inputValue.trim()) {
      e.preventDefault();
      const newTag = inputValue.trim();
      if (!tags.includes(newTag)) {
        onChange([...tags, newTag]);
      }
      setInputValue('');
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 p-2 min-h-[42px] rounded-md border border-zinc-200 bg-white focus-within:border-emerald-300 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
      {tags.map((tag, index) => (
        <span
          key={index}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 text-sm border border-zinc-200"
        >
          {tag}
          <button
            onClick={() => removeTag(index)}
            className="text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={tags.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[120px] text-sm bg-transparent outline-none placeholder:text-zinc-400"
      />
    </div>
  );
}

// --- Stats Bar ---

function StatsBar({
  knowledgeBases,
}: {
  knowledgeBases: KnowledgeBaseItem[];
}) {
  const totalEntries = knowledgeBases.reduce((sum, kb) => sum + kb.entryCount, 0);
  const lastUpdated =
    knowledgeBases.length > 0
      ? knowledgeBases
          .map((kb) => kb.updatedAt)
          .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
      : null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      <Card className="bg-white border-zinc-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100">
              <Database className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Knowledge Bases
              </p>
              <p className="text-xl font-bold text-zinc-900">
                {knowledgeBases.length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border-zinc-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Total Entries
              </p>
              <p className="text-xl font-bold text-zinc-900">{totalEntries}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border-zinc-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100">
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Last Updated
              </p>
              <p className="text-xl font-bold text-zinc-900">
                {lastUpdated ? formatRelativeDate(lastUpdated) : 'Never'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// --- Knowledge Base Card ---

function KnowledgeBaseCard({
  kb,
  onOpen,
  onDelete,
}: {
  kb: KnowledgeBaseItem;
  onOpen: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="bg-white border-zinc-200 hover:shadow-md hover:border-zinc-300 transition-all group">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 group-hover:bg-emerald-200 transition-colors">
              <BookOpen className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-900 group-hover:text-emerald-600 transition-colors">
                {kb.name}
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                {kb.entryCount} {kb.entryCount === 1 ? 'entry' : 'entries'}
              </p>
            </div>
          </div>
        </div>

        {kb.description && (
          <p className="text-sm text-zinc-600 mb-3 line-clamp-2">
            {kb.description}
          </p>
        )}

        {/* Tags */}
        {kb.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {kb.tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-xs bg-zinc-100 text-zinc-600 border-zinc-200"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
          <span className="text-xs text-zinc-400">
            Updated {formatRelativeDate(kb.updatedAt)}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-red-500 hover:text-red-700 hover:bg-red-50"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              onClick={onOpen}
            >
              Open
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// --- Entry Card ---

function EntryCard({
  entry,
  onEdit,
  onDelete,
}: {
  entry: KnowledgeBaseEntry;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const contentPreview =
    entry.content.length > 200
      ? entry.content.substring(0, 200) + '...'
      : entry.content;

  return (
    <Card className="bg-white border-zinc-200 hover:border-zinc-300 transition-all">
      <CardContent className="p-4">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-start gap-3 min-w-0">
            <FileText className="w-4 h-4 text-zinc-400 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-zinc-900 truncate">
                {entry.title}
              </h4>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={`text-xs ${getTypeBadgeStyle(entry.type)}`}>
                  {getTypeLabel(entry.type)}
                </Badge>
                <span className="text-xs text-zinc-400">
                  {formatDate(entry.createdAt)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-zinc-400 hover:text-zinc-600"
              onClick={onEdit}
            >
              <Edit className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-zinc-400 hover:text-red-600"
              onClick={onDelete}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Content Preview */}
        <p className="text-sm text-zinc-600 leading-relaxed ml-7">
          {isExpanded ? entry.content : contentPreview}
        </p>
        {entry.content.length > 200 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="ml-7 mt-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
          >
            {isExpanded ? 'Show less' : 'Show more'}
          </button>
        )}

        {/* Source URL */}
        {entry.sourceUrl && (
          <div className="flex items-center gap-1.5 ml-7 mt-2">
            <Link className="w-3 h-3 text-zinc-400" />
            <a
              href={entry.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-emerald-600 hover:text-emerald-700 hover:underline truncate max-w-[300px]"
            >
              {entry.sourceUrl}
            </a>
            <ExternalLink className="w-3 h-3 text-zinc-400 flex-shrink-0" />
          </div>
        )}

        {/* Tags */}
        {entry.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 ml-7 mt-2">
            {entry.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs text-zinc-500 bg-zinc-50 rounded border border-zinc-100"
              >
                <Tag className="w-2.5 h-2.5" />
                {tag}
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// --- Create KB Dialog ---

function CreateKBDialog({
  isOpen,
  onClose,
  onCreate,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: { name: string; description: string; tags: string[] }) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  const handleSubmit = () => {
    if (name.trim()) {
      onCreate({ name: name.trim(), description: description.trim(), tags });
      setName('');
      setDescription('');
      setTags([]);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle>New Knowledge Base</DialogTitle>
          <DialogDescription>
            Create a collection to organize expert knowledge for AI content generation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-zinc-700">Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Product Expertise, Brand Guidelines"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-zinc-700">
              Description
            </Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what knowledge this collection contains..."
              rows={3}
              className="flex w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-zinc-400 focus:outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/20 transition-all resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-zinc-700">Tags</Label>
            <TagInput
              tags={tags}
              onChange={setTags}
              placeholder="Press Enter to add tags..."
            />
          </div>
        </div>

        <DialogFooter>
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton onClick={handleSubmit} disabled={!name.trim()}>
            Create Knowledge Base
          </PrimaryButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Add/Edit Entry Dialog ---

function EntryDialog({
  isOpen,
  onClose,
  onSave,
  editingEntry,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    title: string;
    content: string;
    sourceUrl: string;
    type: EntryType;
    tags: string[];
  }) => void;
  editingEntry?: KnowledgeBaseEntry | null;
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [type, setType] = useState<EntryType>('expert_knowledge');
  const [tags, setTags] = useState<string[]>([]);

  // Populate form when editing
  useEffect(() => {
    if (editingEntry) {
      setTitle(editingEntry.title);
      setContent(editingEntry.content);
      setSourceUrl(editingEntry.sourceUrl || '');
      setType(editingEntry.type);
      setTags(editingEntry.tags);
    } else {
      setTitle('');
      setContent('');
      setSourceUrl('');
      setType('expert_knowledge');
      setTags([]);
    }
  }, [editingEntry, isOpen]);

  const handleSubmit = () => {
    if (title.trim() && content.trim()) {
      onSave({
        title: title.trim(),
        content: content.trim(),
        sourceUrl: sourceUrl.trim(),
        type,
        tags,
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingEntry ? 'Edit Entry' : 'Add New Entry'}
          </DialogTitle>
          <DialogDescription>
            {editingEntry
              ? 'Update this knowledge entry.'
              : 'Add expert knowledge, product info, or guidelines to improve AI content accuracy.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Title */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-zinc-700">Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Egyptian Cotton Quality Standards"
              autoFocus
            />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-zinc-700">Content</Label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter the expert knowledge, product details, guidelines, or FAQ content here. Be as detailed as possible - the AI will use this to generate more accurate content..."
              rows={8}
              className="flex w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-zinc-400 focus:outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/20 transition-all resize-y min-h-[120px]"
            />
            <p className="text-xs text-zinc-400">
              {content.length} characters
            </p>
          </div>

          {/* Source URL */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-zinc-700">
              Source URL{' '}
              <span className="text-zinc-400 font-normal">(optional)</span>
            </Label>
            <Input
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://example.com/source"
              type="url"
            />
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-zinc-700">Type</Label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as EntryType)}
              className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-background focus:outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/20 transition-all appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2371717a%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_8px_center] bg-no-repeat pr-8"
            >
              {ENTRY_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-zinc-700">Tags</Label>
            <TagInput
              tags={tags}
              onChange={setTags}
              placeholder="Press Enter to add tags..."
            />
          </div>
        </div>

        <DialogFooter>
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton
            onClick={handleSubmit}
            disabled={!title.trim() || !content.trim()}
          >
            {editingEntry ? 'Save Changes' : 'Add Entry'}
          </PrimaryButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Knowledge Base Detail View ---

function KnowledgeBaseDetailView({
  kb,
  onBack,
  onAddEntry,
  onEditEntry,
  onDeleteEntry,
  onUpdateKB,
  searchQuery,
  onSearchChange,
}: {
  kb: KnowledgeBaseItem & { entries: KnowledgeBaseEntry[] };
  onBack: () => void;
  onAddEntry: () => void;
  onEditEntry: (entry: KnowledgeBaseEntry) => void;
  onDeleteEntry: (entryId: string) => void;
  onUpdateKB: (data: { name: string; description: string }) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(kb.name);
  const [editDescription, setEditDescription] = useState(kb.description);

  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return kb.entries;
    const q = searchQuery.toLowerCase().trim();
    return kb.entries.filter(
      (entry) =>
        entry.title.toLowerCase().includes(q) ||
        entry.content.toLowerCase().includes(q) ||
        entry.tags.some((tag) => tag.toLowerCase().includes(q)),
    );
  }, [kb.entries, searchQuery]);

  const handleSaveName = () => {
    if (editName.trim()) {
      onUpdateKB({ name: editName.trim(), description: editDescription.trim() });
      setIsEditingName(false);
    }
  };

  return (
    <div>
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700 mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Knowledge Bases
      </button>

      {/* KB Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="p-3 rounded-xl bg-emerald-100">
            <BookOpen className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            {isEditingName ? (
              <div className="space-y-2">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="text-lg font-bold"
                  autoFocus
                />
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Description..."
                  rows={2}
                  className="flex w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-zinc-400 focus:outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/20 transition-all resize-none"
                />
                <div className="flex gap-2">
                  <PrimaryButton onClick={handleSaveName}>Save</PrimaryButton>
                  <GhostButton onClick={() => setIsEditingName(false)}>
                    Cancel
                  </GhostButton>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-zinc-900">{kb.name}</h2>
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="text-zinc-400 hover:text-zinc-600 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
                {kb.description && (
                  <p className="text-sm text-zinc-500 mt-1">{kb.description}</p>
                )}
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-zinc-400">
                    {kb.entries.length}{' '}
                    {kb.entries.length === 1 ? 'entry' : 'entries'}
                  </span>
                  <span className="text-zinc-300">|</span>
                  <span className="text-xs text-zinc-400">
                    Updated {formatRelativeDate(kb.updatedAt)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        <PrimaryButton onClick={onAddEntry} icon={Plus}>
          Add Entry
        </PrimaryButton>
      </div>

      {/* Search Entries */}
      <div className="relative max-w-sm mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
        <Input
          type="text"
          placeholder="Search entries..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Entries List */}
      {filteredEntries.length === 0 ? (
        <Card className="bg-white border-zinc-200">
          <CardContent className="flex flex-col items-center justify-center py-16 px-6">
            <div className="p-4 rounded-full bg-zinc-100 mb-4">
              <FileText className="h-10 w-10 text-zinc-300" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 mb-2">
              {searchQuery.trim()
                ? 'No matching entries'
                : 'No entries yet'}
            </h3>
            <p className="text-sm text-zinc-500 text-center max-w-md mb-6">
              {searchQuery.trim()
                ? 'Try adjusting your search terms.'
                : 'Add your first entry to teach the AI about your products, brand, and expertise.'}
            </p>
            {!searchQuery.trim() && (
              <PrimaryButton onClick={onAddEntry} icon={Plus}>
                Add First Entry
              </PrimaryButton>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredEntries.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              onEdit={() => onEditEntry(entry)}
              onDelete={() => onDeleteEntry(entry.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// --- Main Page Component ---

export function KnowledgeBase() {
  // State
  const [knowledgeBasesList, setKnowledgeBasesList] = useState<KnowledgeBaseItem[]>([]);
  const [selectedKB, setSelectedKB] = useState<
    (KnowledgeBaseItem & { entries: KnowledgeBaseEntry[] }) | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEntryDialogOpen, setIsEntryDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<KnowledgeBaseEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Auto-dismiss notification
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Fetch knowledge bases on mount
  useEffect(() => {
    fetchKnowledgeBases();
  }, []);

  const fetchKnowledgeBases = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(API_BASE);
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setKnowledgeBasesList(data);
    } catch (error) {
      console.error('Failed to fetch knowledge bases:', error);
      setNotification({
        type: 'error',
        message: 'Failed to load knowledge bases. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchKnowledgeBaseDetail = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE}/${id}`);
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setSelectedKB(data);
    } catch (error) {
      console.error('Failed to fetch knowledge base detail:', error);
      setNotification({
        type: 'error',
        message: 'Failed to load knowledge base details.',
      });
    }
  };

  // --- Handlers ---

  const handleCreateKB = useCallback(
    async (data: { name: string; description: string; tags: string[] }) => {
      try {
        const response = await fetch(API_BASE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to create');
        const newKB = await response.json();
        setKnowledgeBasesList((prev) => [
          ...prev,
          { ...newKB, entryCount: 0 },
        ]);
        setIsCreateDialogOpen(false);
        setNotification({
          type: 'success',
          message: `Knowledge base "${data.name}" created successfully.`,
        });
      } catch (error) {
        setNotification({
          type: 'error',
          message: 'Failed to create knowledge base.',
        });
      }
    },
    [],
  );

  const handleDeleteKB = useCallback(
    async (id: string) => {
      const kb = knowledgeBasesList.find((k) => k.id === id);
      if (!kb) return;

      if (!window.confirm(`Delete "${kb.name}" and all its entries? This cannot be undone.`)) {
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/${id}`, {
          method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to delete');
        setKnowledgeBasesList((prev) => prev.filter((k) => k.id !== id));
        if (selectedKB?.id === id) setSelectedKB(null);
        setNotification({
          type: 'success',
          message: `Knowledge base "${kb.name}" deleted.`,
        });
      } catch (error) {
        setNotification({
          type: 'error',
          message: 'Failed to delete knowledge base.',
        });
      }
    },
    [knowledgeBasesList, selectedKB],
  );

  const handleOpenKB = useCallback((id: string) => {
    fetchKnowledgeBaseDetail(id);
  }, []);

  const handleBackToList = useCallback(() => {
    setSelectedKB(null);
    setSearchQuery('');
    fetchKnowledgeBases();
  }, []);

  const handleUpdateKB = useCallback(
    async (data: { name: string; description: string }) => {
      if (!selectedKB) return;

      try {
        const response = await fetch(`${API_BASE}/${selectedKB.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to update');
        const updated = await response.json();
        setSelectedKB(updated);
        setNotification({
          type: 'success',
          message: 'Knowledge base updated.',
        });
      } catch (error) {
        setNotification({
          type: 'error',
          message: 'Failed to update knowledge base.',
        });
      }
    },
    [selectedKB],
  );

  const handleAddEntry = useCallback(() => {
    setEditingEntry(null);
    setIsEntryDialogOpen(true);
  }, []);

  const handleEditEntry = useCallback((entry: KnowledgeBaseEntry) => {
    setEditingEntry(entry);
    setIsEntryDialogOpen(true);
  }, []);

  const handleSaveEntry = useCallback(
    async (data: {
      title: string;
      content: string;
      sourceUrl: string;
      type: EntryType;
      tags: string[];
    }) => {
      if (!selectedKB) return;

      try {
        if (editingEntry) {
          // Update existing entry
          const response = await fetch(
            `${API_BASE}/${selectedKB.id}/entries/${editingEntry.id}`,
            {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data),
            },
          );
          if (!response.ok) throw new Error('Failed to update entry');
          const updatedEntry = await response.json();

          setSelectedKB((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              entries: prev.entries.map((e) =>
                e.id === editingEntry.id ? updatedEntry : e,
              ),
            };
          });
          setNotification({
            type: 'success',
            message: `Entry "${data.title}" updated.`,
          });
        } else {
          // Create new entry
          const response = await fetch(
            `${API_BASE}/${selectedKB.id}/entries`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data),
            },
          );
          if (!response.ok) throw new Error('Failed to create entry');
          const newEntry = await response.json();

          setSelectedKB((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              entries: [...prev.entries, newEntry],
            };
          });
          setNotification({
            type: 'success',
            message: `Entry "${data.title}" added.`,
          });
        }

        setIsEntryDialogOpen(false);
        setEditingEntry(null);
      } catch (error) {
        setNotification({
          type: 'error',
          message: `Failed to ${editingEntry ? 'update' : 'add'} entry.`,
        });
      }
    },
    [selectedKB, editingEntry],
  );

  const handleDeleteEntry = useCallback(
    async (entryId: string) => {
      if (!selectedKB) return;

      const entry = selectedKB.entries.find((e) => e.id === entryId);
      if (!entry) return;

      if (!window.confirm(`Delete entry "${entry.title}"? This cannot be undone.`)) {
        return;
      }

      try {
        const response = await fetch(
          `${API_BASE}/${selectedKB.id}/entries/${entryId}`,
          { method: 'DELETE' },
        );
        if (!response.ok) throw new Error('Failed to delete entry');

        setSelectedKB((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            entries: prev.entries.filter((e) => e.id !== entryId),
          };
        });
        setNotification({
          type: 'success',
          message: `Entry "${entry.title}" deleted.`,
        });
      } catch (error) {
        setNotification({
          type: 'error',
          message: 'Failed to delete entry.',
        });
      }
    },
    [selectedKB],
  );

  // --- Filtered list for global search ---

  const filteredKBs = useMemo(() => {
    if (!globalSearchQuery.trim()) return knowledgeBasesList;
    const q = globalSearchQuery.toLowerCase().trim();
    return knowledgeBasesList.filter(
      (kb) =>
        kb.name.toLowerCase().includes(q) ||
        kb.description.toLowerCase().includes(q) ||
        kb.tags.some((tag) => tag.toLowerCase().includes(q)),
    );
  }, [knowledgeBasesList, globalSearchQuery]);

  // --- Loading State ---

  if (isLoading) {
    return (
      <div>
        <PageHeader
          title="Knowledge Base"
          description="Teach your AI with expert knowledge"
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-white border-zinc-200">
              <CardContent className="p-4">
                <div className="h-14 bg-zinc-100 rounded-lg animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-white border-zinc-200">
              <CardContent className="p-5">
                <div className="space-y-3">
                  <div className="h-5 w-2/3 bg-zinc-100 rounded animate-pulse" />
                  <div className="h-4 w-full bg-zinc-100 rounded animate-pulse" />
                  <div className="h-4 w-1/2 bg-zinc-100 rounded animate-pulse" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // --- Detail View ---

  if (selectedKB) {
    return (
      <div>
        {/* Notification */}
        {notification && (
          <NotificationBanner
            type={notification.type}
            message={notification.message}
            onDismiss={() => setNotification(null)}
          />
        )}

        <KnowledgeBaseDetailView
          kb={selectedKB}
          onBack={handleBackToList}
          onAddEntry={handleAddEntry}
          onEditEntry={handleEditEntry}
          onDeleteEntry={handleDeleteEntry}
          onUpdateKB={handleUpdateKB}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* Entry Dialog */}
        <EntryDialog
          isOpen={isEntryDialogOpen}
          onClose={() => {
            setIsEntryDialogOpen(false);
            setEditingEntry(null);
          }}
          onSave={handleSaveEntry}
          editingEntry={editingEntry}
        />
      </div>
    );
  }

  // --- List View ---

  return (
    <div>
      {/* Page Header */}
      <PageHeader
        title="Knowledge Base"
        description="Teach your AI with expert knowledge to improve content generation accuracy and reduce hallucination"
      >
        <PrimaryButton
          onClick={() => setIsCreateDialogOpen(true)}
          icon={Plus}
        >
          New Knowledge Base
        </PrimaryButton>
      </PageHeader>

      {/* Notification */}
      {notification && (
        <NotificationBanner
          type={notification.type}
          message={notification.message}
          onDismiss={() => setNotification(null)}
        />
      )}

      {/* Stats */}
      <StatsBar knowledgeBases={knowledgeBasesList} />

      {/* Global Search */}
      {knowledgeBasesList.length > 0 && (
        <div className="relative max-w-sm mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            type="text"
            placeholder="Search knowledge bases..."
            value={globalSearchQuery}
            onChange={(e) => setGlobalSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {/* Empty State */}
      {knowledgeBasesList.length === 0 && (
        <Card className="bg-white border-zinc-200">
          <CardContent className="flex flex-col items-center justify-center py-16 px-6">
            <div className="p-4 rounded-full bg-emerald-50 mb-4">
              <Brain className="h-12 w-12 text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 mb-2">
              Teach your AI
            </h3>
            <p className="text-sm text-zinc-500 text-center max-w-lg mb-6">
              Create knowledge bases to share your product expertise, brand
              guidelines, and industry knowledge with the AI. This helps generate
              more accurate, on-brand content and reduces hallucination.
            </p>
            <PrimaryButton
              onClick={() => setIsCreateDialogOpen(true)}
              icon={Plus}
            >
              Create Your First Knowledge Base
            </PrimaryButton>
          </CardContent>
        </Card>
      )}

      {/* No search results */}
      {knowledgeBasesList.length > 0 &&
        filteredKBs.length === 0 &&
        globalSearchQuery.trim() && (
          <Card className="bg-white border-zinc-200">
            <CardContent className="flex flex-col items-center justify-center py-12 px-6">
              <Search className="h-8 w-8 text-zinc-300 mb-3" />
              <h3 className="text-base font-semibold text-zinc-900 mb-1">
                No knowledge bases found
              </h3>
              <p className="text-sm text-zinc-500 text-center max-w-md">
                No knowledge bases match "{globalSearchQuery}". Try adjusting
                your search.
              </p>
            </CardContent>
          </Card>
        )}

      {/* Knowledge Base Grid */}
      {filteredKBs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredKBs.map((kb) => (
            <KnowledgeBaseCard
              key={kb.id}
              kb={kb}
              onOpen={() => handleOpenKB(kb.id)}
              onDelete={() => handleDeleteKB(kb.id)}
            />
          ))}
        </div>
      )}

      {/* Create KB Dialog */}
      <CreateKBDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onCreate={handleCreateKB}
      />
    </div>
  );
}

export default KnowledgeBase;
