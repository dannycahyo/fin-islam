import { useReducer, useRef, useState } from 'react';
import { Upload, X, FileText } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';
import { Label } from '~/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { useToast } from '~/hooks/use-toast';

type Category = 'principle' | 'product' | 'comparison' | 'general';

const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
];

const FILE_EXTENSIONS = ['.pdf', '.docx', '.txt', '.md'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_TITLE_LENGTH = 500;
const MAX_DESCRIPTION_LENGTH = 1000;

interface FormState {
  file: File | null;
  title: string;
  category: Category | '';
  description: string;
  errors: {
    file?: string;
    title?: string;
    category?: string;
    description?: string;
  };
}

type FormAction =
  | { type: 'SET_FILE'; payload: File | null }
  | { type: 'SET_TITLE'; payload: string }
  | { type: 'SET_CATEGORY'; payload: Category | '' }
  | { type: 'SET_DESCRIPTION'; payload: string }
  | { type: 'SET_ERROR'; field: keyof FormState['errors']; message: string }
  | { type: 'CLEAR_ERROR'; field: keyof FormState['errors'] }
  | { type: 'RESET_FORM' };

const initialState: FormState = {
  file: null,
  title: '',
  category: '',
  description: '',
  errors: {},
};

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'SET_FILE':
      return { ...state, file: action.payload };
    case 'SET_TITLE':
      return { ...state, title: action.payload };
    case 'SET_CATEGORY':
      return { ...state, category: action.payload };
    case 'SET_DESCRIPTION':
      return { ...state, description: action.payload };
    case 'SET_ERROR':
      return {
        ...state,
        errors: { ...state.errors, [action.field]: action.message },
      };
    case 'CLEAR_ERROR':
      // eslint-disable-next-line no-case-declarations, @typescript-eslint/no-unused-vars
      const { [action.field]: _, ...remainingErrors } = state.errors;
      return { ...state, errors: remainingErrors };
    case 'RESET_FORM':
      return initialState;
    default:
      return state;
  }
}

export function DocumentUploadForm() {
  const [state, dispatch] = useReducer(formReducer, initialState);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const validateFile = (file: File): string | null => {
    // Check file type
    const hasValidType = ALLOWED_FILE_TYPES.includes(file.type);
    const hasValidExtension = FILE_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext));

    if (!hasValidType && !hasValidExtension) {
      return 'Invalid file type. Only PDF, DOCX, TXT, and MD files are allowed.';
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return 'File size exceeds 10MB limit.';
    }

    return null;
  };

  const validateForm = (): boolean => {
    let isValid = true;

    // Validate file
    if (!state.file) {
      dispatch({
        type: 'SET_ERROR',
        field: 'file',
        message: 'Please select a file.',
      });
      isValid = false;
    }

    // Validate title
    if (!state.title.trim()) {
      dispatch({
        type: 'SET_ERROR',
        field: 'title',
        message: 'Title is required.',
      });
      isValid = false;
    } else if (state.title.length > MAX_TITLE_LENGTH) {
      dispatch({
        type: 'SET_ERROR',
        field: 'title',
        message: `Title must be ${MAX_TITLE_LENGTH} characters or less.`,
      });
      isValid = false;
    }

    // Validate category
    if (!state.category) {
      dispatch({
        type: 'SET_ERROR',
        field: 'category',
        message: 'Category is required.',
      });
      isValid = false;
    }

    // Validate description
    if (state.description.length > MAX_DESCRIPTION_LENGTH) {
      dispatch({
        type: 'SET_ERROR',
        field: 'description',
        message: `Description must be ${MAX_DESCRIPTION_LENGTH} characters or less.`,
      });
      isValid = false;
    }

    return isValid;
  };

  const handleFileSelect = (file: File) => {
    const error = validateFile(file);
    if (error) {
      dispatch({ type: 'SET_ERROR', field: 'file', message: error });
      dispatch({ type: 'SET_FILE', payload: null });
    } else {
      dispatch({ type: 'CLEAR_ERROR', field: 'file' });
      dispatch({ type: 'SET_FILE', payload: file });
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleRemoveFile = () => {
    dispatch({ type: 'SET_FILE', payload: null });
    dispatch({ type: 'CLEAR_ERROR', field: 'file' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    dispatch({ type: 'SET_TITLE', payload: value });
    if (state.errors.title) {
      dispatch({ type: 'CLEAR_ERROR', field: 'title' });
    }
  };

  const handleCategoryChange = (value: string) => {
    dispatch({ type: 'SET_CATEGORY', payload: value as Category });
    if (state.errors.category) {
      dispatch({ type: 'CLEAR_ERROR', field: 'category' });
    }
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    dispatch({ type: 'SET_DESCRIPTION', payload: value });
    if (state.errors.description) {
      dispatch({ type: 'CLEAR_ERROR', field: 'description' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', state.file!);
      formData.append('title', state.title);
      formData.append('category', state.category);
      formData.append('description', state.description);

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      toast({
        title: 'Success',
        description: 'Document uploaded successfully.',
      });

      // Reset form
      dispatch({ type: 'RESET_FORM' });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to upload document. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const isFormValid =
    state.file &&
    state.title.trim() &&
    state.category &&
    !state.errors.file &&
    !state.errors.title &&
    !state.errors.category &&
    !state.errors.description;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* File Upload Area */}
      <div className="space-y-2">
        <Label htmlFor="file-upload">Document File *</Label>
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
            transition-colors
            ${
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-primary/50'
            }
            ${state.errors.file ? 'border-destructive' : ''}
          `}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            id="file-upload"
            type="file"
            accept={FILE_EXTENSIONS.join(',')}
            onChange={handleFileInputChange}
            className="hidden"
          />

          {state.file ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                <div className="text-left">
                  <p className="font-medium">{state.file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(state.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveFile();
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-10 w-10 text-muted-foreground" />
              <div>
                <p className="font-medium">Drag and drop your file here, or click to browse</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Supported formats: PDF, DOCX, TXT, MD (max 10MB)
                </p>
              </div>
            </div>
          )}
        </div>
        {state.errors.file && <p className="text-sm text-destructive">{state.errors.file}</p>}
      </div>

      {/* Title Input */}
      <div className="space-y-2">
        <Label htmlFor="title">
          Title *{' '}
          <span className="text-muted-foreground font-normal">
            ({state.title.length}/{MAX_TITLE_LENGTH})
          </span>
        </Label>
        <Input
          id="title"
          value={state.title}
          onChange={handleTitleChange}
          placeholder="Enter document title"
          className={state.errors.title ? 'border-destructive' : ''}
        />
        {state.errors.title && <p className="text-sm text-destructive">{state.errors.title}</p>}
      </div>

      {/* Category Select */}
      <div className="space-y-2">
        <Label htmlFor="category">Category *</Label>
        <Select value={state.category} onValueChange={handleCategoryChange}>
          <SelectTrigger
            id="category"
            className={state.errors.category ? 'border-destructive' : ''}
          >
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="principle">Principle</SelectItem>
            <SelectItem value="product">Product</SelectItem>
            <SelectItem value="comparison">Comparison</SelectItem>
            <SelectItem value="general">General</SelectItem>
          </SelectContent>
        </Select>
        {state.errors.category && (
          <p className="text-sm text-destructive">{state.errors.category}</p>
        )}
      </div>

      {/* Description Textarea */}
      <div className="space-y-2">
        <Label htmlFor="description">
          Description{' '}
          <span className="text-muted-foreground font-normal">
            ({state.description.length}/{MAX_DESCRIPTION_LENGTH})
          </span>
        </Label>
        <Textarea
          id="description"
          value={state.description}
          onChange={handleDescriptionChange}
          placeholder="Enter document description (optional)"
          rows={4}
          className={state.errors.description ? 'border-destructive' : ''}
        />
        {state.errors.description && (
          <p className="text-sm text-destructive">{state.errors.description}</p>
        )}
      </div>

      {/* Submit Button */}
      <Button type="submit" disabled={!isFormValid || isUploading} className="w-full">
        {isUploading ? 'Uploading...' : 'Upload Document'}
      </Button>
    </form>
  );
}
