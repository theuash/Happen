import { Toaster } from 'sonner';

function ToastProvider({ children }) {
  return (
    <>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'white',
            border: '1px solid #E5E7EB',
            borderRadius: '0.5rem',
          },
          className: 'toast-container',
        }}
      />
    </>
  );
}

export default ToastProvider;
