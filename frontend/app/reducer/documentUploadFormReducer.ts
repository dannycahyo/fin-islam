import {
  ALLOWED_FILE_TYPES,
  FILE_EXTENSIONS,
  MAX_FILE_SIZE,
  MAX_TITLE_LENGTH,
  MAX_DESCRIPTION_LENGTH,
} from '~/constants/document';

// Types
export type Category = 'principle' | 'product' | 'comparison' | 'general';

export interface FormState {
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

export type FormAction =
  | { type: 'SET_FILE'; payload: File | null }
  | { type: 'SET_TITLE'; payload: string }
  | { type: 'SET_CATEGORY'; payload: Category | '' }
  | { type: 'SET_DESCRIPTION'; payload: string }
  | { type: 'SET_ERROR'; field: keyof FormState['errors']; message: string }
  | { type: 'CLEAR_ERROR'; field: keyof FormState['errors'] }
  | { type: 'RESET_FORM' };

// Initial State
export const initialFormState: FormState = {
  file: null,
  title: '',
  category: '',
  description: '',
  errors: {},
};

// Reducer
export function formReducer(state: FormState, action: FormAction): FormState {
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
      return initialFormState;
    default:
      return state;
  }
}

// Validation Functions
export function validateFile(file: File): string | null {
  const hasValidType = ALLOWED_FILE_TYPES.includes(file.type);
  const hasValidExtension = FILE_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext));

  if (!hasValidType && !hasValidExtension) {
    return 'Invalid file type. Only PDF, DOCX, TXT, and MD files are allowed.';
  }

  if (file.size > MAX_FILE_SIZE) {
    return 'File size exceeds 10MB limit.';
  }

  return null;
}

export function validateForm(state: FormState): {
  isValid: boolean;
  errors: Array<{ field: keyof FormState['errors']; message: string }>;
} {
  const errors: Array<{ field: keyof FormState['errors']; message: string }> = [];

  // Validate file
  if (!state.file) {
    errors.push({
      field: 'file',
      message: 'Please select a file.',
    });
  }

  // Validate title
  if (!state.title.trim()) {
    errors.push({
      field: 'title',
      message: 'Title is required.',
    });
  } else if (state.title.length > MAX_TITLE_LENGTH) {
    errors.push({
      field: 'title',
      message: `Title must be ${MAX_TITLE_LENGTH} characters or less.`,
    });
  }

  // Validate category
  if (!state.category) {
    errors.push({
      field: 'category',
      message: 'Category is required.',
    });
  }

  // Validate description
  if (state.description.length > MAX_DESCRIPTION_LENGTH) {
    errors.push({
      field: 'description',
      message: `Description must be ${MAX_DESCRIPTION_LENGTH} characters or less.`,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
