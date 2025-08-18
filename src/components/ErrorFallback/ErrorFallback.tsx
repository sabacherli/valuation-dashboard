import { Button } from '../ui/button';

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center bg-background">
      <div className="max-w-md p-8 space-y-4 bg-card rounded-lg shadow-lg">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-destructive">Something went wrong</h1>
          <p className="text-muted-foreground">
            {error.message || 'An unexpected error occurred'}
          </p>
          <pre className="p-4 mt-4 text-sm text-left text-muted-foreground bg-muted rounded-md overflow-x-auto">
            {error.stack || 'No stack trace available'}
          </pre>
        </div>
        <Button
          onClick={resetErrorBoundary}
          variant="outline"
          className="mt-4"
        >
          Try again
        </Button>
      </div>
    </div>
  );
}

export default ErrorFallback;
export { ErrorFallback };
