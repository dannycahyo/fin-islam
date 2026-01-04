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
import { useUploadDocument } from '~/hooks/use-documents';
import {
  formReducer,
  initialFormState,
  validateFile,
  validateForm,
} from '~/reducer/documentUploadFormReducer';
import { FILE_EXTENSIONS, MAX_TITLE_LENGTH, MAX_DESCRIPTION_LENGTH } from '~/constants/document';
import type { DocumentCategory } from 'shared';

export function DocumentUploadForm() {
  const [state, dispatch] = useReducer(formReducer, initialFormState);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const uploadMutation = useUploadDocument();

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
    dispatch({ type: 'SET_CATEGORY', payload: value as DocumentCategory });
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

    const validation = validateForm(state);
    if (!validation.isValid) {
      validation.errors.forEach((error) => {
        dispatch({
          type: 'SET_ERROR',
          field: error.field,
          message: error.message,
        });
      });
      return;
    }

    uploadMutation.mutate(
      {
        file: state.file!,
        title: state.title,
        category: state.category as DocumentCategory,
        description: state.description || undefined,
      },
      {
        onSuccess: () => {
          toast({
            title: 'Success',
            description: 'Document uploaded successfully.',
          });

          dispatch({ type: 'RESET_FORM' });
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        },
        onError: () => {
          toast({
            title: 'Error',
            description: 'Failed to upload document. Please try again.',
            variant: 'destructive',
          });
        },
      }
    );
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
            <SelectItem value="principles">Principles</SelectItem>
            <SelectItem value="products">Products</SelectItem>
            <SelectItem value="compliance">Compliance</SelectItem>
            <SelectItem value="comparison">Comparison</SelectItem>
            <SelectItem value="calculation">Calculation</SelectItem>
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
      <Button type="submit" disabled={!isFormValid || uploadMutation.isPending} className="w-full">
        {uploadMutation.isPending ? 'Uploading...' : 'Upload Document'}
      </Button>
    </form>
  );
}
